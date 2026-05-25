"use client";

// Hook yang membungkus seluruh flow upload mingguan SV — parse → validate
// → commit (15 mutations + storage upload + finalize + bridges + master
// seed + AI index). Diekstrak supaya multi-file uploader bisa pakai flow
// yang sama tanpa duplikasi.

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import * as XLSXLib from "xlsx";
import { parseExcelFile } from "../lib/xlsxHelpers";
import { parseLPKK, type LPKKItem } from "../parsers/parseLPKK";
import { parsePenjualan, type ProductSaleItem } from "../parsers/parsePenjualan";
import { parsePlatformSales } from "../parsers/parsePlatformSales";
import { parseVendor, type VendorPurchaseItem } from "../parsers/parseVendor";
import { parseWeeklyFC, type InventoryValuationItem } from "../parsers/parseWeeklyFC";
import { parseLeftOver, type LeftOverItem } from "../parsers/parseLeftOver";
import { parseLaporanKasPeriode, type DailyCashSummaryItem } from "../parsers/parseLaporanKasPeriode";
import { parseSalesControl, type SalesControlItem } from "../parsers/parseSalesControl";
import { parsePembelianKredit, type CreditPurchaseItem } from "../parsers/parsePembelianKredit";
import { parseIkhtisarFC, type FoodCostSummaryItem } from "../parsers/parseIkhtisarFC";
import { parseTransferTOTI, type TransferItem } from "../parsers/parseTransferTOTI";
import { parseHPPProduk, type ProductHPPItem } from "../parsers/parseHPPProduk";
import { parseCostAnalysis, type CostAnalysisItem } from "../parsers/parseCostAnalysis";
import { parseLapCF, type DailyCashFlowItem } from "../parsers/parseLapCF";
import { parseOwnerTransfers, type OwnerTransferItem } from "../parsers/parseOwnerTransfers";
import { parseInsentif, type IncentiveItem } from "../parsers/parseInsentif";
import { validateParsedData, type ValidationWarning } from "../lib/validateParsedData";
import type { Id } from "../../../../convex/_generated/dataModel";

export type WeeklyParsedData = {
  lpkk: LPKKItem[];
  penjualan: ProductSaleItem[];
  platformSales: ProductSaleItem[];
  vendor: VendorPurchaseItem[];
  weeklyFc: InventoryValuationItem[];
  leftover: LeftOverItem[];
  kasPeriode: DailyCashSummaryItem[];
  salesControl: SalesControlItem[];
  pembelianKredit: CreditPurchaseItem[];
  ikhtisarFC: FoodCostSummaryItem[];
  transferTOTI: TransferItem[];
  hppProduk: ProductHPPItem[];
  costAnalysis: CostAnalysisItem[];
  cashFlow: DailyCashFlowItem[];
  ownerTransfers: OwnerTransferItem[];
  insentif: IncentiveItem[];
  unknownSheets: string[];
  periodStart: string;
  periodEnd: string;
  fileName: string;
  fileStorageId?: Id<"_storage">;
};

const CHUNK_SIZE = 50;
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

const MONTH_MAP: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MEI: "05", MAY: "05",
  JUN: "06", JUL: "07", AGU: "08", AUG: "08", SEP: "09",
  OKT: "10", OCT: "10", NOV: "11", DES: "12", DEC: "12",
};

export function extractPeriodFromFileName(fileName: string): { start: string; end: string } {
  const name = fileName.toUpperCase().replace(/\.[A-Z]+$/, "");
  const SEP = "[\\s_\\-.]";
  const sep = name.match(new RegExp(`(\\d{1,2})${SEP}+(\\d{1,2})${SEP}+([A-Z]+)${SEP}+(\\d{4})`));
  if (sep) {
    const [, d1, d2, mon, year] = sep;
    const m = MONTH_MAP[mon];
    if (m) {
      const d1n = Number(d1), d2n = Number(d2);
      const startD = Math.min(d1n, d2n), endD = Math.max(d1n, d2n);
      return {
        start: `${year}-${m}-${String(startD).padStart(2, "0")}`,
        end: `${year}-${m}-${String(endD).padStart(2, "0")}`,
      };
    }
  }
  // Continuous "DDDD MMM YYYY" — 4 digits = startDD + endDD
  const cont = name.match(/(\d{4})\s+([A-Z]+)\s+(\d{4})/);
  if (cont) {
    const [, dd, mon, year] = cont;
    const m = MONTH_MAP[mon];
    if (m && dd.length === 4) {
      const d1n = Number(dd.slice(0, 2));
      const d2n = Number(dd.slice(2));
      const startD = Math.min(d1n, d2n), endD = Math.max(d1n, d2n);
      return {
        start: `${year}-${m}-${String(startD).padStart(2, "0")}`,
        end: `${year}-${m}-${String(endD).padStart(2, "0")}`,
      };
    }
  }
  return { start: "", end: "" };
}

function extractPeriodFromSheets(wb: import("xlsx").WorkBook): { start: string; end: string } {
  const candidates = ["LAP. PENJUALAN", "LAP. CF", "WEEKLY FC", "LPKK"];
  for (const sn of wb.SheetNames) {
    const up = sn.toUpperCase();
    if (!candidates.some((c) => up.includes(c))) continue;
    const ws = wb.Sheets[sn];
    const rows = XLSXLib.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
    for (const row of rows.slice(0, 10)) {
      const text = row.map((c) => String(c ?? "")).join(" ").toUpperCase();
      const m = text.match(/(\d{1,2})[\s\-_.]+(\d{1,2})[\s\-_.]+([A-Z]+)[\s\-_.]+(\d{4})/);
      if (m) {
        const [, d1, d2, mon, year] = m;
        const mm = MONTH_MAP[mon];
        if (mm) {
          const d1n = Number(d1), d2n = Number(d2);
          const startD = Math.min(d1n, d2n), endD = Math.max(d1n, d2n);
          return {
            start: `${year}-${mm}-${String(startD).padStart(2, "0")}`,
            end: `${year}-${mm}-${String(endD).padStart(2, "0")}`,
          };
        }
      }
    }
  }
  return { start: "", end: "" };
}

const KNOWN_SHEET_PATTERNS = [
  "LPKK", "LAP. PENJUALAN", "LAP. PENJUALAN GRAB FOOD", "LAP. PENJUALAN GO FOOD", "LAP. PENJUALAN SHOPEE FOOD",
  "VENDOR", "WEEKLY FC", "LEFT OVER", "LAPORAN KAS PERIODE", "SALES CONTROL",
  "PEMBELIAN KREDIT", "IKHTISAR FOOD COST", "TO - TI", "HITUNGAN HPP PRODUK",
  "FOOD COST ITEM KELAS", "COST ANALYSIS", "LAP. CF", "INSENTIF",
];

export type WeeklyImportProgress = { current: number; total: number; label: string };
export type WeeklyImportResult = {
  reportId: Id<"weeklyReports">;
  counts: {
    expense: number; sales: number; vendor: number; inventory: number; leftover: number;
    kasPeriode: number; salesControl: number; creditPurchase: number;
    fcSummary: number; transfer: number; hpp: number; costAnalysis: number; cashFlow: number;
    ownerTransfer: number; incentive: number;
  };
};

export function useWeeklyImport() {
  // ── Master ref queries ─────────────────────────────────
  const sheetRegistry = useQuery(api.features.masterData.queries.listSheetRegistry, { activeOnly: true });
  const sheetRegistryRef = useRef<typeof sheetRegistry>(undefined);
  useEffect(() => { sheetRegistryRef.current = sheetRegistry; }, [sheetRegistry]);
  const categoryRules = useQuery(api.features.masterData.queries.listCategoryRules, { activeOnly: true });
  const categoryRulesRef = useRef<typeof categoryRules>(undefined);
  useEffect(() => { categoryRulesRef.current = categoryRules; }, [categoryRules]);
  const globalHppNames = useQuery(api.features.reports.queries.listAllHppProductNames, {});
  const globalHppNamesRef = useRef<typeof globalHppNames>(undefined);
  useEffect(() => { globalHppNamesRef.current = globalHppNames; }, [globalHppNames]);
  const globalCostAnalysisNames = useQuery(api.features.reports.queries.listAllCostAnalysisItemNames, {});
  const globalCostAnalysisNamesRef = useRef<typeof globalCostAnalysisNames>(undefined);
  useEffect(() => { globalCostAnalysisNamesRef.current = globalCostAnalysisNames; }, [globalCostAnalysisNames]);

  // ── Mutations / actions ────────────────────────────────
  const createReport      = useMutation(api.features.reports.mutations.createWeeklyReport);
  const generateUploadUrl = useMutation(api.features.reports.mutations.generateReportUploadUrl);
  const importLPKK        = useMutation(api.features.reports.mutations.importLPKKBatch);
  const importSales       = useMutation(api.features.reports.mutations.importProductSalesBatch);
  const importVendor      = useMutation(api.features.reports.mutations.importVendorPurchasesBatch);
  const importInventory   = useMutation(api.features.reports.mutations.importInventoryValuationBatch);
  const importLeftOver    = useMutation(api.features.reports.mutations.importLeftOverBatch);
  const importKasPeriode  = useMutation(api.features.reports.mutations.importDailyCashSummaryBatch);
  const importSalesCtrl   = useMutation(api.features.reports.mutations.importSalesControlBatch);
  const importKredit      = useMutation(api.features.reports.mutations.importCreditPurchasesBatch);
  const importFCSummary   = useMutation(api.features.reports.mutations.importFoodCostSummaryBatch);
  const importTransfer    = useMutation(api.features.reports.mutations.importTransferItemsBatch);
  const importHPP         = useMutation(api.features.reports.mutations.importProductHPPBatch);
  const importCostAn      = useMutation(api.features.reports.mutations.importCostAnalysisBatch);
  const importCashFlow    = useMutation(api.features.reports.mutations.importDailyCashFlowBatch);
  const importOwnerTransfers = useMutation(api.features.reports.mutations.importOwnerTransfersBatch);
  const importIncentive   = useMutation(api.features.reports.mutations.importEmployeeIncentivesBatch);
  const finalizeReport    = useMutation(api.features.reports.mutations.finalizeWeeklyReport);
  const runBridges        = useAction(api.features.reports.bridges.runBridgesForReport);
  const deleteReport      = useMutation(api.features.reports.mutations.deleteWeeklyReport);
  const indexReport       = useAction(api.features.ai.indexing.indexReportData);
  const aiConfig          = useQuery(api.features.ai.queries.getAiConfig);
  const runMasterSeed     = useAction(api.features.masterData.mutations.runFullMasterSeed);
  const recentReports     = useQuery(api.features.reports.queries.listWeeklyReports, {});

  // ── Parse ─────────────────────────────────────────────
  const parse = useCallback(async (file: File): Promise<{ parsed: WeeklyParsedData; warnings: ValidationWarning[] }> => {
    // Storage upload in parallel
    const storagePromise: Promise<Id<"_storage"> | undefined> = (async () => {
      try {
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!res.ok) return undefined;
        const { storageId } = await res.json() as { storageId: Id<"_storage"> };
        return storageId;
      } catch { return undefined; }
    })();

    const wb = await parseExcelFile(file);
    let { start, end } = extractPeriodFromFileName(file.name);
    if (!start || !end) {
      const fallback = extractPeriodFromSheets(wb);
      if (fallback.start && fallback.end) {
        start = fallback.start;
        end = fallback.end;
      }
    }
    const unknownSheets = wb.SheetNames.filter((sheetName) => {
      const up = sheetName.toUpperCase();
      return !KNOWN_SHEET_PATTERNS.some((p) => up.includes(p.toUpperCase()));
    });
    const parsed: WeeklyParsedData = {
      lpkk:            parseLPKK(wb, categoryRulesRef.current ?? undefined),
      penjualan:       parsePenjualan(wb),
      platformSales:   parsePlatformSales(wb),
      vendor:          parseVendor(wb),
      weeklyFc:        parseWeeklyFC(wb, categoryRulesRef.current ?? undefined),
      leftover:        parseLeftOver(wb),
      kasPeriode:      parseLaporanKasPeriode(wb),
      salesControl:    parseSalesControl(wb, start, end),
      pembelianKredit: parsePembelianKredit(wb),
      ikhtisarFC:      parseIkhtisarFC(wb),
      transferTOTI:    parseTransferTOTI(wb),
      hppProduk:       parseHPPProduk(wb),
      costAnalysis:    parseCostAnalysis(wb),
      cashFlow:        parseLapCF(wb),
      ownerTransfers:  parseOwnerTransfers(wb, start),
      unknownSheets,
      insentif:        parseInsentif(wb),
      periodStart:     start,
      periodEnd:       end,
      fileName:        file.name,
      fileStorageId:   await storagePromise,
    };
    const warnings = validateParsedData(
      {
        ...parsed,
        sheetRegistry: sheetRegistryRef.current ?? [],
        categoryRules: categoryRulesRef.current ?? [],
        globalHppNames: globalHppNamesRef.current ?? [],
        globalCostAnalysisNames: globalCostAnalysisNamesRef.current ?? [],
      },
      file.name,
    );
    return { parsed, warnings };
  }, [generateUploadUrl]);

  // ── Commit ────────────────────────────────────────────
  const commit = useCallback(async (
    parsed: WeeklyParsedData,
    warnings: ValidationWarning[],
    opts?: { onProgress?: (p: WeeklyImportProgress) => void; replaceExistingId?: Id<"weeklyReports"> },
  ): Promise<WeeklyImportResult> => {
    const onProgress = opts?.onProgress ?? (() => {});

    // Replace mode: delete old report first
    if (opts?.replaceExistingId) {
      await deleteReport({ reportId: opts.replaceExistingId });
    }

    const allSales = [...parsed.penjualan, ...parsed.platformSales];
    const lpkkChunks  = chunkArray(parsed.lpkk, CHUNK_SIZE);
    const salesChunks = chunkArray(allSales, CHUNK_SIZE);
    const total = 1 + lpkkChunks.length + salesChunks.length +
      (parsed.vendor.length > 0 ? 1 : 0) +
      (parsed.weeklyFc.length > 0 ? 1 : 0) +
      (parsed.leftover.length > 0 ? 1 : 0) +
      (parsed.kasPeriode.length > 0 ? 1 : 0) +
      (parsed.salesControl.length > 0 ? 1 : 0) +
      (parsed.pembelianKredit.length > 0 ? 1 : 0) +
      (parsed.ikhtisarFC.length > 0 ? 1 : 0) +
      (parsed.transferTOTI.length > 0 ? 1 : 0) +
      (parsed.hppProduk.length > 0 ? 1 : 0) +
      (parsed.costAnalysis.length > 0 ? 1 : 0) +
      (parsed.cashFlow.length > 0 ? 1 : 0) +
      (parsed.ownerTransfers.length > 0 ? 1 : 0) +
      (parsed.insentif.length > 0 ? 1 : 0) + 1;
    let current = 0;
    const counts = {
      expense: 0, sales: 0, vendor: 0, inventory: 0, leftover: 0,
      kasPeriode: 0, salesControl: 0, creditPurchase: 0,
      fcSummary: 0, transfer: 0, hpp: 0, costAnalysis: 0, cashFlow: 0,
      ownerTransfer: 0, incentive: 0,
    };

    onProgress({ current: ++current, total, label: "Membuat record laporan..." });
    const reportId = await createReport({
      fileName: parsed.fileName,
      fileStorageId: parsed.fileStorageId,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      unknownSheets: parsed.unknownSheets.length > 0 ? parsed.unknownSheets : undefined,
    });

    for (const chunk of lpkkChunks) {
      onProgress({ current: ++current, total, label: `Kas kecil (${counts.expense + chunk.length}/${parsed.lpkk.length})...` });
      counts.expense += await importLPKK({ reportId, items: chunk });
    }
    for (const chunk of salesChunks) {
      onProgress({ current: ++current, total, label: `Penjualan (${counts.sales + chunk.length}/${allSales.length})...` });
      counts.sales += await importSales({ reportId, items: chunk });
    }
    if (parsed.vendor.length > 0) {
      onProgress({ current: ++current, total, label: "Vendor/stok..." });
      counts.vendor = await importVendor({ reportId, weekStart: parsed.periodStart, items: parsed.vendor });
    }
    if (parsed.weeklyFc.length > 0) {
      onProgress({ current: ++current, total, label: "Food cost..." });
      counts.inventory = await importInventory({ reportId, valuationDate: parsed.periodEnd, items: parsed.weeklyFc });
    }
    if (parsed.leftover.length > 0) {
      onProgress({ current: ++current, total, label: "Left over..." });
      counts.leftover = await importLeftOver({ reportId, items: parsed.leftover });
    }
    if (parsed.kasPeriode.length > 0) {
      onProgress({ current: ++current, total, label: "Laporan kas periode..." });
      counts.kasPeriode = await importKasPeriode({ reportId, items: parsed.kasPeriode });
    }
    if (parsed.salesControl.length > 0) {
      onProgress({ current: ++current, total, label: "Sales control..." });
      counts.salesControl = await importSalesCtrl({ reportId, items: parsed.salesControl });
    }
    if (parsed.pembelianKredit.length > 0) {
      onProgress({ current: ++current, total, label: "Pembelian kredit..." });
      counts.creditPurchase = await importKredit({ reportId, items: parsed.pembelianKredit });
    }
    if (parsed.ikhtisarFC.length > 0) {
      onProgress({ current: ++current, total, label: "Ikhtisar food cost..." });
      counts.fcSummary = await importFCSummary({ reportId, periodStart: parsed.periodStart, items: parsed.ikhtisarFC });
    }
    if (parsed.transferTOTI.length > 0) {
      onProgress({ current: ++current, total, label: "Transfer TO-TI..." });
      counts.transfer = await importTransfer({ reportId, periodStart: parsed.periodStart, items: parsed.transferTOTI });
    }
    if (parsed.hppProduk.length > 0) {
      onProgress({ current: ++current, total, label: "HPP produk..." });
      counts.hpp = await importHPP({ reportId, periodStart: parsed.periodStart, items: parsed.hppProduk });
    }
    if (parsed.costAnalysis.length > 0) {
      onProgress({ current: ++current, total, label: "Cost analysis..." });
      counts.costAnalysis = await importCostAn({ reportId, periodStart: parsed.periodStart, items: parsed.costAnalysis });
    }
    if (parsed.cashFlow.length > 0) {
      onProgress({ current: ++current, total, label: "Cash flow..." });
      counts.cashFlow = await importCashFlow({ reportId, items: parsed.cashFlow });
    }
    if (parsed.ownerTransfers.length > 0) {
      onProgress({ current: ++current, total, label: "Transfer owner..." });
      counts.ownerTransfer = await importOwnerTransfers({ reportId, items: parsed.ownerTransfers });
    }
    if (parsed.insentif.length > 0) {
      onProgress({ current: ++current, total, label: "Insentif karyawan..." });
      counts.incentive = await importIncentive({ reportId, periodStart: parsed.periodStart, items: parsed.insentif });
    }

    onProgress({ current: total, total, label: "Menyelesaikan..." });
    await finalizeReport({
      reportId, status: "processed",
      expenseCount:        counts.expense,
      salesCount:          counts.sales,
      vendorCount:         counts.vendor,
      inventoryCount:      counts.inventory,
      leftoverCount:       counts.leftover,
      kasPeriodeCount:     counts.kasPeriode,
      salesControlCount:   counts.salesControl,
      creditPurchaseCount: counts.creditPurchase,
      foodCostSummaryCount: counts.fcSummary,
      transferCount:       counts.transfer,
      hppCount:            counts.hpp,
      costAnalysisCount:   counts.costAnalysis,
      cashFlowCount:       counts.cashFlow,
      incentiveCount:      counts.incentive,
      validationNotes: warnings.map((w) => ({
        severity: w.severity, category: w.category, message: w.message, tip: w.tip,
      })),
    });

    // Bridge + master seed + AI index — async, non-blocking
    onProgress({ current: total, total, label: "Sinkron Buku Besar & Piutang..." });
    try {
      const bridgeResult = await runBridges({ reportId });
      const totalBridged =
        (bridgeResult.payables?.inserted ?? 0) +
        (bridgeResult.expenses?.inserted ?? 0) +
        (bridgeResult.sales?.inserted ?? 0) +
        (bridgeResult.transfers?.inserted ?? 0) +
        (bridgeResult.incentives?.inserted ?? 0);
      if (totalBridged > 0) {
        toast.success(`${parsed.fileName} — Buku Besar +${totalBridged} transaksi`);
      }
    } catch (e) {
      console.error("bridge error", e);
    }

    runMasterSeed({}).catch((e) => console.error("auto-seed error", e));

    if (aiConfig?.provider?.embeddingModel) {
      indexReport({ reportId }).catch(() => {});
    }

    return { reportId, counts };
  }, [
    createReport, importLPKK, importSales, importVendor, importInventory,
    importLeftOver, importKasPeriode, importSalesCtrl, importKredit,
    importFCSummary, importTransfer, importHPP, importCostAn, importCashFlow,
    importOwnerTransfers, importIncentive, finalizeReport, runBridges,
    deleteReport, indexReport, aiConfig, runMasterSeed,
  ]);

  /** Check apakah periode parsed sudah ada di DB. Returns existing report or null. */
  const findDuplicate = useCallback((parsed: WeeklyParsedData) => {
    if (!recentReports || !parsed.periodStart) return null;
    return recentReports.find((r) => r.periodStart === parsed.periodStart) ?? null;
  }, [recentReports]);

  return { parse, commit, findDuplicate };
}
