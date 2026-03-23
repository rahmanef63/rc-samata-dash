"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { parseExcelFile } from "@/features/report-upload/lib/xlsxHelpers";
import { parseLPKK, type LPKKItem } from "@/features/report-upload/parsers/parseLPKK";
import { parsePenjualan, type ProductSaleItem } from "@/features/report-upload/parsers/parsePenjualan";
import { parsePlatformSales } from "@/features/report-upload/parsers/parsePlatformSales";
import { parseVendor, type VendorPurchaseItem } from "@/features/report-upload/parsers/parseVendor";
import { parseWeeklyFC, type InventoryValuationItem } from "@/features/report-upload/parsers/parseWeeklyFC";
import { parseLeftOver, type LeftOverItem } from "@/features/report-upload/parsers/parseLeftOver";
import { parseLaporanKasPeriode, type DailyCashSummaryItem } from "@/features/report-upload/parsers/parseLaporanKasPeriode";
import { parseSalesControl, type SalesControlItem } from "@/features/report-upload/parsers/parseSalesControl";
import { parsePembelianKredit, type CreditPurchaseItem } from "@/features/report-upload/parsers/parsePembelianKredit";
import { parseIkhtisarFC, type FoodCostSummaryItem } from "@/features/report-upload/parsers/parseIkhtisarFC";
import { parseTransferTOTI, type TransferItem } from "@/features/report-upload/parsers/parseTransferTOTI";
import { parseHPPProduk, type ProductHPPItem } from "@/features/report-upload/parsers/parseHPPProduk";
import { parseCostAnalysis, type CostAnalysisItem } from "@/features/report-upload/parsers/parseCostAnalysis";
import { parseLapCF, type DailyCashFlowItem } from "@/features/report-upload/parsers/parseLapCF";
import { parseInsentif, type IncentiveItem } from "@/features/report-upload/parsers/parseInsentif";
import { UploadDropzone } from "@/features/report-upload/components/UploadDropzone";
import { ImportPreview } from "@/features/report-upload/components/ImportPreview";
import { validateParsedData, type ValidationWarning } from "@/features/report-upload/lib/validateParsedData";
import { formatRpFull } from "@/shared/lib";
import { CheckCircle, Loader2, Upload, AlertCircle, Trash2, AlertTriangle, Info, XCircle } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";

type ParsedData = {
  lpkk: LPKKItem[];
  penjualan: ProductSaleItem[];         // LAP. PENJUALAN (all channels combined)
  platformSales: ProductSaleItem[];     // Grab, GoFood, Shopee, Tambahan
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
  insentif: IncentiveItem[];
  periodStart: string;
  periodEnd: string;
  fileName: string;
};

type ImportStep = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

const CHUNK_SIZE = 50;
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function extractPeriod(fileName: string): { start: string; end: string } {
  const name = fileName.toUpperCase();
  const monthMap: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MEI: "05", MAY: "05",
    JUN: "06", JUL: "07", AGU: "08", AUG: "08", SEP: "09",
    OKT: "10", OCT: "10", NOV: "11", DES: "12", DEC: "12",
  };
  const match = name.match(/(\d+)-(\d+)\s+([A-Z]+)\s+(\d{4})/);
  if (!match) return { start: "", end: "" };
  const [, d1, d2, mon, year] = match;
  const m = monthMap[mon] ?? "01";
  return { start: `${year}-${m}-${d1.padStart(2, "0")}`, end: `${year}-${m}-${d2.padStart(2, "0")}` };
}

export default function LaporanUploadPage() {
  const [step, setStep] = useState<ImportStep>("idle");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [activeTab, setActiveTab] = useState("lpkk");
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [duplicateReport, setDuplicateReport] = useState<{ _id: Id<"weeklyReports">; fileName: string; periodStart: string } | null>(null);

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const recentReports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip"
  );

  const createReport      = useMutation(api.features.reports.mutations.createWeeklyReport);
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
  const importIncentive   = useMutation(api.features.reports.mutations.importEmployeeIncentivesBatch);
  const finalizeReport    = useMutation(api.features.reports.mutations.finalizeWeeklyReport);
  const deleteReport      = useMutation(api.features.reports.mutations.deleteWeeklyReport);

  // ─── Parse file ─────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setStep("parsing");
    try {
      const wb = await parseExcelFile(file);
      const { start, end } = extractPeriod(file.name);
      const data: ParsedData = {
        lpkk:            parseLPKK(wb),
        penjualan:       parsePenjualan(wb),
        platformSales:   parsePlatformSales(wb),
        vendor:          parseVendor(wb),
        weeklyFc:        parseWeeklyFC(wb),
        leftover:        parseLeftOver(wb),
        kasPeriode:      parseLaporanKasPeriode(wb),
        salesControl:    parseSalesControl(wb, start),
        pembelianKredit: parsePembelianKredit(wb),
        ikhtisarFC:      parseIkhtisarFC(wb),
        transferTOTI:    parseTransferTOTI(wb),
        hppProduk:       parseHPPProduk(wb),
        costAnalysis:    parseCostAnalysis(wb),
        cashFlow:        parseLapCF(wb),
        insentif:        parseInsentif(wb),
        periodStart:     start,
        periodEnd:       end,
        fileName:        file.name,
      };
      setParsed(data);
      const warnings = validateParsedData(data);
      setValidationWarnings(warnings);
      setStep("preview");
      const total = Object.values(data).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
      const errorCount = warnings.filter((w) => w.severity === "error").length;
      if (errorCount > 0) {
        toast.warning(`File dibaca: ${total} record — ${errorCount} error ditemukan`);
      } else {
        toast.success(`File dibaca: ${total} record dari ${wb.SheetNames.length} sheet`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file.");
      setStep("idle");
    }
  }, []);

  // ─── Cek duplikat sebelum import ────────────────────────────

  const checkAndImport = async () => {
    if (!parsed || !branchId) return;
    // Cek duplikat via query langsung
    const existing = recentReports?.find((r) => r.periodStart === parsed.periodStart);
    if (existing) {
      setDuplicateReport({ _id: existing._id, fileName: existing.fileName, periodStart: existing.periodStart });
      return;
    }
    await runImport();
  };

  const handleReplaceAndImport = async () => {
    if (!duplicateReport) return;
    await deleteReport({ reportId: duplicateReport._id });
    setDuplicateReport(null);
    await runImport();
  };

  // ─── Jalankan import ─────────────────────────────────────────

  const runImport = async () => {
    if (!parsed || !branchId) return;
    setStep("importing");

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
      (parsed.insentif.length > 0 ? 1 : 0) + 1;
    let current = 0;
    const counts = {
      expense: 0, sales: 0, vendor: 0, inventory: 0, leftover: 0,
      kasPeriode: 0, salesControl: 0, creditPurchase: 0,
      fcSummary: 0, transfer: 0, hpp: 0, costAnalysis: 0, cashFlow: 0, incentive: 0,
    };

    try {
      setProgress({ current: ++current, total, label: "Membuat record laporan..." });
      const reportId = await createReport({ branchId, fileName: parsed.fileName, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd });

      for (const chunk of lpkkChunks) {
        setProgress({ current: ++current, total, label: `Kas kecil (${counts.expense + chunk.length}/${parsed.lpkk.length})...` });
        counts.expense += await importLPKK({ reportId, branchId, items: chunk });
      }

      for (const chunk of salesChunks) {
        setProgress({ current: ++current, total, label: `Penjualan (${counts.sales + chunk.length}/${allSales.length})...` });
        counts.sales += await importSales({ reportId, branchId, items: chunk });
      }

      if (parsed.vendor.length > 0) {
        setProgress({ current: ++current, total, label: "Vendor/stok..." });
        counts.vendor = await importVendor({ reportId, branchId, weekStart: parsed.periodStart, items: parsed.vendor });
      }

      if (parsed.weeklyFc.length > 0) {
        setProgress({ current: ++current, total, label: "Food cost..." });
        counts.inventory = await importInventory({ reportId, branchId, valuationDate: parsed.periodEnd, items: parsed.weeklyFc });
      }

      if (parsed.leftover.length > 0) {
        setProgress({ current: ++current, total, label: "Left over..." });
        counts.leftover = await importLeftOver({ reportId, branchId, items: parsed.leftover });
      }

      if (parsed.kasPeriode.length > 0) {
        setProgress({ current: ++current, total, label: "Laporan kas periode..." });
        counts.kasPeriode = await importKasPeriode({ reportId, branchId, items: parsed.kasPeriode });
      }

      if (parsed.salesControl.length > 0) {
        setProgress({ current: ++current, total, label: "Sales control..." });
        counts.salesControl = await importSalesCtrl({ reportId, branchId, items: parsed.salesControl });
      }

      if (parsed.pembelianKredit.length > 0) {
        setProgress({ current: ++current, total, label: "Pembelian kredit..." });
        counts.creditPurchase = await importKredit({ reportId, branchId, items: parsed.pembelianKredit });
      }

      if (parsed.ikhtisarFC.length > 0) {
        setProgress({ current: ++current, total, label: "Ikhtisar food cost..." });
        counts.fcSummary = await importFCSummary({ reportId, branchId, periodStart: parsed.periodStart, items: parsed.ikhtisarFC });
      }

      if (parsed.transferTOTI.length > 0) {
        setProgress({ current: ++current, total, label: "Transfer TO-TI..." });
        counts.transfer = await importTransfer({ reportId, branchId, periodStart: parsed.periodStart, items: parsed.transferTOTI });
      }

      if (parsed.hppProduk.length > 0) {
        setProgress({ current: ++current, total, label: "HPP produk..." });
        counts.hpp = await importHPP({ reportId, branchId, periodStart: parsed.periodStart, items: parsed.hppProduk });
      }

      if (parsed.costAnalysis.length > 0) {
        setProgress({ current: ++current, total, label: "Cost analysis..." });
        counts.costAnalysis = await importCostAn({ reportId, branchId, periodStart: parsed.periodStart, items: parsed.costAnalysis });
      }

      if (parsed.cashFlow.length > 0) {
        setProgress({ current: ++current, total, label: "Cash flow..." });
        counts.cashFlow = await importCashFlow({ reportId, branchId, items: parsed.cashFlow });
      }

      if (parsed.insentif.length > 0) {
        setProgress({ current: ++current, total, label: "Insentif karyawan..." });
        counts.incentive = await importIncentive({ reportId, branchId, periodStart: parsed.periodStart, items: parsed.insentif });
      }

      setProgress({ current: total, total, label: "Menyelesaikan..." });
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
      });

      setResult(counts);
      setStep("done");
      toast.success("Import berhasil!");
    } catch (err) {
      console.error(err);
      toast.error("Error saat import. Cek console.");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setParsed(null);
    setResult(null);
    setValidationWarnings([]);
    setDuplicateReport(null);
    setProgress({ current: 0, total: 0, label: "" });
  };

  // ─── Total record ────────────────────────────────────────────
  const totalParsed = parsed
    ? parsed.lpkk.length + parsed.penjualan.length + parsed.platformSales.length +
      parsed.vendor.length + parsed.weeklyFc.length + parsed.leftover.length +
      parsed.kasPeriode.length + parsed.salesControl.length + parsed.pembelianKredit.length +
      parsed.ikhtisarFC.length + parsed.transferTOTI.length + parsed.hppProduk.length +
      parsed.costAnalysis.length + parsed.cashFlow.length + parsed.insentif.length
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">Upload Laporan Mingguan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file Excel "NEW LAP" — otomatis parse 15 sheet ke database.
        </p>
      </div>

      {/* ─── Idle ─── */}
      {(step === "idle" || step === "parsing") && (
        <UploadDropzone onFileSelect={handleFileSelect} isLoading={step === "parsing"} />
      )}
      {step === "parsing" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />Membaca file Excel...
        </div>
      )}

      {/* ─── Duplicate Warning Modal ─── */}
      {duplicateReport && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">Laporan periode ini sudah ada!</p>
          </div>
          <p className="text-sm text-muted-foreground">
            File <strong>{duplicateReport.fileName}</strong> dengan periode mulai{" "}
            <strong>{duplicateReport.periodStart}</strong> sudah pernah diupload.
            Timpa data lama atau batalkan?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDuplicateReport(null)} className="px-4 py-2 rounded-xl border border-border text-sm">
              Batal
            </button>
            <button
              onClick={handleReplaceAndImport}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold"
            >
              Timpa & Import Ulang
            </button>
          </div>
        </div>
      )}

      {/* ─── Preview ─── */}
      {step === "preview" && parsed && !duplicateReport && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 bg-muted/20 flex flex-wrap gap-4 text-sm">
            <div><span className="text-muted-foreground text-xs">File</span><p className="font-medium">{parsed.fileName}</p></div>
            <div><span className="text-muted-foreground text-xs">Periode</span><p className="font-medium">{parsed.periodStart} → {parsed.periodEnd}</p></div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { label: "Kas Kecil", count: parsed.lpkk.length, color: "text-orange-600" },
              { label: "Penjualan", count: parsed.penjualan.length + parsed.platformSales.length, color: "text-primary" },
              { label: "Left Over", count: parsed.leftover.length, color: "text-red-500" },
              { label: "Kas Periode", count: parsed.kasPeriode.length, color: "text-blue-600" },
              { label: "Sales Ctrl", count: parsed.salesControl.length, color: "text-purple-600" },
              { label: "Vendor", count: parsed.vendor.length, color: "text-teal-600" },
              { label: "Food Cost", count: parsed.weeklyFc.length, color: "text-green-600" },
              { label: "Beli Kredit", count: parsed.pembelianKredit.length, color: "text-yellow-600" },
              { label: "Ikhtisar FC", count: parsed.ikhtisarFC.length, color: "text-emerald-600" },
              { label: "Transfer", count: parsed.transferTOTI.length, color: "text-cyan-600" },
              { label: "HPP", count: parsed.hppProduk.length, color: "text-indigo-600" },
              { label: "Cost Anls", count: parsed.costAnalysis.length, color: "text-pink-600" },
              { label: "Cash Flow", count: parsed.cashFlow.length, color: "text-lime-600" },
              { label: "Insentif", count: parsed.insentif.length, color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-2 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          <ImportPreview data={parsed} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* ─── Validation Warnings ─── */}
          {validationWarnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Validasi Data</h3>
              {validationWarnings.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 text-sm ${
                    w.severity === "error"
                      ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                      : w.severity === "warning"
                        ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
                        : "border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {w.severity === "error" ? (
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                    ) : w.severity === "warning" ? (
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        <span className="text-xs text-muted-foreground mr-1">[{w.category}]</span>
                        {w.message}
                      </p>
                      {w.details && w.details.length > 0 && (
                        <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          {w.details.map((d, j) => (
                            <li key={j} className="truncate">• {d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm">Batal</button>
            <button
              onClick={checkAndImport}
              disabled={!branchId || totalParsed === 0 || validationWarnings.some((w) => w.severity === "error")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import {totalParsed} Record
              {validationWarnings.filter((w) => w.severity === "warning").length > 0 && (
                <span className="text-xs opacity-75">
                  ({validationWarnings.filter((w) => w.severity === "warning").length} warning)
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Importing ─── */}
      {step === "importing" && (
        <div className="rounded-xl border border-border p-8 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">{progress.label}</p>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{progress.current} / {progress.total}</p>
        </div>
      )}

      {/* ─── Done ─── */}
      {step === "done" && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <p className="font-semibold">Import Berhasil!</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Expense", val: result.expense },
              { label: "Penjualan", val: result.sales },
              { label: "Vendor", val: result.vendor },
              { label: "Food Cost", val: result.inventory },
              { label: "Left Over", val: result.leftover },
              { label: "Kas Periode", val: result.kasPeriode },
              { label: "Sales Control", val: result.salesControl },
              { label: "Beli Kredit", val: result.creditPurchase },
              { label: "Ikhtisar FC", val: result.fcSummary },
              { label: "Transfer", val: result.transfer },
              { label: "HPP", val: result.hpp },
              { label: "Cost Analysis", val: result.costAnalysis },
              { label: "Cash Flow", val: result.cashFlow },
              { label: "Insentif", val: result.incentive },
            ].map((r) => (
              <div key={r.label} className="text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{r.val}</p>
                <p className="text-xs text-muted-foreground">{r.label}</p>
              </div>
            ))}
          </div>
          <button onClick={reset} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Upload File Lainnya
          </button>
        </div>
      )}

      {/* ─── Error ─── */}
      {step === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" /><p className="font-semibold">Import Gagal</p>
          </div>
          <p className="text-sm text-muted-foreground">Terjadi error saat menyimpan data. Cek console untuk detail.</p>
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm">Coba Lagi</button>
        </div>
      )}

      {/* ─── Riwayat Upload ─── */}
      {recentReports && recentReports.length > 0 && step === "idle" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riwayat Upload</h2>
          <div className="space-y-2">
            {recentReports.map((r) => (
              <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.periodStart} → {r.periodEnd}
                    {" · "}{r.expenseCount ?? 0} expense
                    {" · "}{r.salesCount ?? 0} penjualan
                    {r.leftoverCount ? ` · ${r.leftoverCount} leftover` : ""}
                    {r.kasPeriodeCount ? ` · ${r.kasPeriodeCount} kas` : ""}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "processed" ? "bg-green-100 text-green-700" :
                  r.status === "error" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {r.status}
                </span>
                <button
                  onClick={async () => {
                    if (!confirm(`Hapus laporan "${r.fileName}"?`)) return;
                    await deleteReport({ reportId: r._id });
                    toast.success("Laporan dihapus");
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
