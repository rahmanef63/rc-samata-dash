"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
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
import { ImportPreview, type ParsedData as ImportParsedData } from "@/features/report-upload/components/ImportPreview";
import { validateParsedData, type ValidationWarning } from "@/features/report-upload/lib/validateParsedData";
import { formatRpFull } from "@/shared/lib";
import { CheckCircle, Loader2, Upload, AlertCircle, Trash2, AlertTriangle, Info, Brain, ShieldCheck, ShieldAlert } from "lucide-react";
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
  const [lastReportId, setLastReportId] = useState<Id<"weeklyReports"> | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<"idle" | "indexing" | "done" | "error">("idle");

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const recentReports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip"
  );

  const createBranch      = useMutation(api.features.masterData.mutations.createBranch);
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
  const updateValidation  = useMutation(api.features.reports.mutations.updateValidationStatus);
  const indexReport       = useAction(api.features.ai.indexing.indexReportData);
  const aiConfig          = useQuery(api.features.ai.queries.getAiConfig);

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
      if (warnings.length > 0) {
        toast.success(`File dibaca: ${total} record dari ${wb.SheetNames.length} sheet (${warnings.length} catatan)`);
      } else {
        toast.success(`File dibaca: ${total} record dari ${wb.SheetNames.length} sheet`);
      }
    } catch {
      toast.error("Gagal membaca file. Pastikan format .xlsx valid.");
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
        validationNotes: validationWarnings.map((w) => ({
          severity: w.severity,
          category: w.category,
          message: w.message,
          tip: w.tip,
        })),
      });

      setResult(counts);
      setLastReportId(reportId);
      setStep("done");
      toast.success("Import berhasil!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saat import. Silakan coba lagi.");
      setStep("error");
    }
  };

  // ─── Handle tag edits in ImportPreview ───────────────────────
  const handleDataChange = useCallback((key: keyof ImportParsedData, index: number, field: string, value: string) => {
    setParsed((prev) => {
      if (!prev) return prev;
      const arr = [...(prev[key] as Record<string, unknown>[])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [key]: arr };
    });
  }, []);

  const reset = () => {
    setStep("idle");
    setParsed(null);
    setResult(null);
    setValidationWarnings([]);
    setDuplicateReport(null);
    setProgress({ current: 0, total: 0, label: "" });
    setLastReportId(null);
    setIndexingStatus("idle");
  };

  const handleIndexForAi = async () => {
    if (!lastReportId) return;
    setIndexingStatus("indexing");
    try {
      const res = await indexReport({ reportId: lastReportId });
      setIndexingStatus("done");
      toast.success(`AI index selesai: ${res.indexed} record di-embed`);
    } catch (err) {
      setIndexingStatus("error");
      toast.error(err instanceof Error ? err.message : "Gagal index data untuk AI");
    }
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
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Laporan Mingguan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file Excel &quot;NEW LAP&quot; — otomatis parse 15 sheet ke database.
        </p>
      </div>

      {/* ─── No Branch Warning ─── */}
      {branches !== undefined && branches.length === 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Belum ada cabang terdaftar</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">Upload membutuhkan minimal 1 cabang. Klik tombol untuk membuat cabang RC Samata Gowa secara otomatis.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await createBranch({ code: "RC-SAMATA", name: "RC Samata Gowa", location: "Gowa, Sulawesi Selatan", isActive: true });
              toast.success("Cabang RC Samata Gowa berhasil dibuat");
            }}
            className="shrink-0 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold transition-colors"
          >
            Buat Cabang Default
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* ─── Idle ─── */}
          {(step === "idle" || step === "parsing") && (
            <div className="bg-card border border-border rounded-xl p-1 shadow-sm">
              <UploadDropzone onFileSelect={handleFileSelect} isLoading={step === "parsing"} />
            </div>
          )}
          {step === "parsing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
              <Loader2 className="h-4 w-4 animate-spin" />Membaca file Excel...
            </div>
          )}

          {/* ─── Duplicate Warning Modal ─── */}
          {duplicateReport && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-6 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <p className="text-lg font-bold">Laporan periode ini sudah ada!</p>
              </div>
              <p className="text-sm text-yellow-800/80 dark:text-yellow-200/80 font-medium">
                File <strong className="text-yellow-900 dark:text-yellow-100">{duplicateReport.fileName}</strong> dengan periode mulai{" "}
                <strong className="text-yellow-900 dark:text-yellow-100">{duplicateReport.periodStart}</strong> sudah pernah diupload.
                Timpa data lama atau batalkan?
              </p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDuplicateReport(null)} className="px-5 py-2.5 rounded-xl border border-yellow-300/50 bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 text-yellow-800 dark:text-yellow-200 text-sm font-semibold transition-colors">
                  Batal
                </button>
                <button
                  onClick={handleReplaceAndImport}
                  className="px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
                >
                  Timpa & Import Ulang
                </button>
              </div>
            </div>
          )}

          {/* ─── Preview ─── */}
          {step === "preview" && parsed && !duplicateReport && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4 bg-card shadow-sm flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">File</span>
                  <p className="font-medium text-sm truncate" title={parsed.fileName}>{parsed.fileName}</p>
                </div>
                <div className="rounded-xl border border-border p-4 bg-card shadow-sm flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Periode</span>
                  <p className="font-medium text-sm truncate">{parsed.periodStart} → {parsed.periodEnd}</p>
                </div>
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
                  <div key={s.label} className="rounded-xl border border-border p-3 text-center bg-card shadow-sm">
                    <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight font-medium uppercase tracking-wide mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card shadow-sm rounded-xl border border-border overflow-hidden">
                <ImportPreview data={parsed} activeTab={activeTab} onTabChange={setActiveTab} onDataChange={handleDataChange} />
              </div>

              {/* ─── Validation Info ─── */}
              {validationWarnings.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Validasi Data</h3>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">Informatif — tidak memblokir upload</span>
                  </div>
                  {validationWarnings.map((w, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 text-sm shadow-sm ${
                        w.severity === "warning"
                          ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800"
                          : "border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {w.severity === "warning" ? (
                          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <Info className="h-5 w-5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">
                            <span className="text-xs text-muted-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded mr-2">[{w.category}]</span>
                            {w.message}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{w.tip}</p>
                          {w.details && w.details.length > 0 && (
                            <ul className="mt-2 text-xs text-muted-foreground space-y-1 bg-background/30 rounded-lg py-2 px-3">
                              {w.details.map((d, j) => (
                                <li key={j} className="truncate tracking-wide">• {d}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={reset} className="px-6 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-medium transition-colors shadow-sm">
                  Batal
                </button>
                <button
                  onClick={checkAndImport}
                  disabled={!branchId || totalParsed === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  Import {totalParsed} Record
                  {validationWarnings.length > 0 && (
                    <span className="text-xs opacity-75 font-normal bg-black/10 px-1.5 py-0.5 rounded">
                      ({validationWarnings.length} catatan)
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Importing ─── */}
          {step === "importing" && (
            <div className="rounded-xl border border-border bg-card p-10 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">Menyimpan Laporan</p>
                  <p className="text-sm text-muted-foreground mt-1">{progress.label}</p>
                </div>
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right font-medium tracking-wide">
                  {progress.current} / {progress.total}
                </p>
              </div>
            </div>
          )}

          {/* ─── Done ─── */}
          {step === "done" && result && (
             <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-8 shadow-sm animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col items-center justify-center gap-3 text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-1">Import Berhasil</h3>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80 font-medium">Laporan mingguan telah tersimpan ke database</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
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
                  <div key={r.label} className="text-center bg-white/50 dark:bg-black/20 rounded-lg p-2 border border-green-200/50 dark:border-green-800/50">
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{r.val}</p>
                    <p className="text-[10px] uppercase font-semibold text-green-600/70 dark:text-green-400/70 tracking-tight">{r.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={reset} 
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-sm order-2 sm:order-1"
                >
                  Upload File Lainnya
                </button>
                {aiConfig?.provider && aiConfig.provider.embeddingModel && lastReportId && (
                  <button
                    onClick={handleIndexForAi}
                    disabled={indexingStatus === "indexing" || indexingStatus === "done"}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-sm font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none order-1 sm:order-2"
                  >
                    {indexingStatus === "indexing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : indexingStatus === "done" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    {indexingStatus === "indexing" ? "Sedang Indexing..." : indexingStatus === "done" ? "Tersedia untuk AI" : "Proses Index ke AI Chat"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Error ─── */}
          {step === "error" && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 flex flex-col items-center justify-center gap-5 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
               <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-destructive mb-1">Import Gagal</h3>
                <p className="text-destructive/80 font-medium">Terjadi error saat menyimpan data.</p>
              </div>
              <button onClick={reset} className="mt-2 px-6 py-2.5 rounded-xl border border-destructive/20 bg-card hover:bg-destructive/10 text-destructive text-sm font-semibold transition-colors shadow-sm">
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Side Panel Riwayat Upload */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden sticky top-6">
            <div className="p-4 border-b border-border/50 bg-muted/20">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Riwayat Mingguan
              </h2>
            </div>
            <div className="p-2 flex-1 max-h-[700px] overflow-y-auto">
              {(!recentReports || recentReports.length === 0) ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                   <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                     <Upload className="h-6 w-6 text-muted-foreground/50" />
                   </div>
                   <div className="space-y-1">
                     <p className="text-sm font-medium text-foreground">Belum ada riwayat</p>
                     <p className="text-xs text-muted-foreground">Laporan mingguan akan muncul di sini</p>
                   </div>
                 </div>
              ) : (
                <div className="space-y-1">
                  {recentReports.map((r) => {
                    const shortId = r._id.slice(-8).toUpperCase();
                    const totalRecords = (r.expenseCount ?? 0) + (r.salesCount ?? 0) + (r.vendorCount ?? 0) + (r.inventoryCount ?? 0) + (r.leftoverCount ?? 0) + (r.kasPeriodeCount ?? 0) + (r.salesControlCount ?? 0) + (r.creditPurchaseCount ?? 0) + (r.foodCostSummaryCount ?? 0) + (r.transferCount ?? 0) + (r.hppCount ?? 0) + (r.costAnalysisCount ?? 0) + (r.cashFlowCount ?? 0) + (r.incentiveCount ?? 0);
                    return (
                      <div key={r._id} className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          r.status === "processed" ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" :
                          r.status === "error" ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : 
                          "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400"
                        }`}>
                          <Upload className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors" title={r.fileName}>
                            {r.fileName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground border border-border/50">
                              #{shortId}
                            </span>
                            <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-background border border-border">
                              {r.status}
                            </span>
                            {r.validationStatus === "needs_review" && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateValidation({ reportId: r._id, validationStatus: "validated" });
                                  toast.success(`Laporan #${shortId} ditandai sudah divalidasi`);
                                }}
                                className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors"
                                title={`${(r.validationNotes ?? []).length} catatan — klik untuk tandai sudah diperiksa`}
                              >
                                <ShieldAlert className="h-3 w-3" />
                                {(r.validationNotes ?? []).length} catatan
                              </button>
                            )}
                            {r.validationStatus === "validated" && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-300 dark:border-green-700">
                                <ShieldCheck className="h-3 w-3" />
                                validated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                            {r.periodStart} → {r.periodEnd}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                            {totalRecords} records
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm(`Hapus laporan #${shortId} "${r.fileName}"?\n\nSemua data terkait akan ikut terhapus.`)) return;
                            await deleteReport({ reportId: r._id });
                            toast.success(`Laporan #${shortId} dihapus`);
                          }}
                          className="text-muted-foreground opacity-0 md:group-hover:opacity-100 hover:text-destructive transition-all p-2 rounded-lg hover:bg-destructive/10 shrink-0 self-start"
                          title={`Hapus #${shortId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
