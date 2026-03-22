"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { parseExcelFile } from "@/features/report-upload/lib/xlsxHelpers";
import { parseLPKK, type LPKKItem } from "@/features/report-upload/parsers/parseLPKK";
import { parsePenjualan, type ProductSaleItem } from "@/features/report-upload/parsers/parsePenjualan";
import { parseVendor, type VendorPurchaseItem } from "@/features/report-upload/parsers/parseVendor";
import { parseWeeklyFC, type InventoryValuationItem } from "@/features/report-upload/parsers/parseWeeklyFC";
import { UploadDropzone } from "@/features/report-upload/components/UploadDropzone";
import { ImportPreview } from "@/features/report-upload/components/ImportPreview";
import { formatRpFull } from "@/shared/lib";
import { CheckCircle, Loader2, Upload, AlertCircle, Trash2 } from "lucide-react";

type ParsedData = {
  lpkk: LPKKItem[];
  penjualan: ProductSaleItem[];
  vendor: VendorPurchaseItem[];
  weeklyFc: InventoryValuationItem[];
  periodStart: string;
  periodEnd: string;
  fileName: string;
};

type ImportStep =
  | "idle"
  | "parsing"
  | "preview"
  | "importing"
  | "done"
  | "error";

const CHUNK_SIZE = 50;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Ekstrak periode dari nama file: "NEW LAP 1-7 JAN 2025.xlsx" → {start, end}
function extractPeriod(fileName: string): { start: string; end: string } {
  const name = fileName.toUpperCase();
  const monthMap: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04",
    MEI: "05", MAY: "05", JUN: "06", JUL: "07",
    AGU: "08", AUG: "08", SEP: "09", OKT: "10",
    OCT: "10", NOV: "11", DES: "12", DEC: "12",
  };

  // Cari pola "1-7 JAN 2025" atau "22-31 JAN 2026"
  const match = name.match(/(\d+)-(\d+)\s+([A-Z]+)\s+(\d{4})/);
  if (!match) return { start: "", end: "" };

  const [, d1, d2, mon, year] = match;
  const m = monthMap[mon] ?? "01";
  return {
    start: `${year}-${m}-${d1.padStart(2, "0")}`,
    end:   `${year}-${m}-${d2.padStart(2, "0")}`,
  };
}

export default function LaporanUploadPage() {
  const [step, setStep] = useState<ImportStep>("idle");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [activeTab, setActiveTab] = useState("lpkk");
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [result, setResult] = useState<Record<string, number> | null>(null);

  // Convex
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const recentReports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip"
  );

  const createReport = useMutation(api.features.reports.mutations.createWeeklyReport);
  const importLPKK = useMutation(api.features.reports.mutations.importLPKKBatch);
  const importSales = useMutation(api.features.reports.mutations.importProductSalesBatch);
  const importVendor = useMutation(api.features.reports.mutations.importVendorPurchasesBatch);
  const importInventory = useMutation(api.features.reports.mutations.importInventoryValuationBatch);
  const finalizeReport = useMutation(api.features.reports.mutations.finalizeWeeklyReport);
  const deleteReport = useMutation(api.features.reports.mutations.deleteWeeklyReport);

  const handleFileSelect = useCallback(async (file: File) => {
    setStep("parsing");
    try {
      const wb = await parseExcelFile(file);
      const lpkk = parseLPKK(wb);
      const penjualan = parsePenjualan(wb);
      const vendor = parseVendor(wb);
      const weeklyFc = parseWeeklyFC(wb);
      const { start, end } = extractPeriod(file.name);

      setParsed({ lpkk, penjualan, vendor, weeklyFc, periodStart: start, periodEnd: end, fileName: file.name });
      setStep("preview");
      toast.success(`File berhasil dibaca: ${lpkk.length} expense, ${penjualan.length} penjualan`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file. Pastikan format file benar.");
      setStep("idle");
    }
  }, []);

  const handleImport = async () => {
    if (!parsed || !branchId) return;
    setStep("importing");

    const lpkkChunks = chunkArray(parsed.lpkk, CHUNK_SIZE);
    const salesChunks = chunkArray(parsed.penjualan, CHUNK_SIZE);
    const total = 1 + lpkkChunks.length + salesChunks.length + 1 + 1;
    let current = 0;
    const counts = { expense: 0, sales: 0, vendor: 0, inventory: 0 };

    try {
      // 1. Buat header report
      setProgress({ current: ++current, total, label: "Membuat record laporan..." });
      const reportId = await createReport({
        branchId,
        fileName: parsed.fileName,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
      });

      // 2. Import LPKK (expenses) — per chunk
      for (const chunk of lpkkChunks) {
        setProgress({ current: ++current, total, label: `Import kas kecil (${counts.expense + chunk.length}/${parsed.lpkk.length})...` });
        const n = await importLPKK({ reportId, branchId, items: chunk });
        counts.expense += n;
      }

      // 3. Import penjualan — per chunk
      for (const chunk of salesChunks) {
        setProgress({ current: ++current, total, label: `Import penjualan (${counts.sales + chunk.length}/${parsed.penjualan.length})...` });
        const n = await importSales({ reportId, branchId, items: chunk });
        counts.sales += n;
      }

      // 4. Import vendor
      if (parsed.vendor.length > 0) {
        setProgress({ current: ++current, total, label: "Import data vendor/stok..." });
        const n = await importVendor({
          reportId,
          branchId,
          weekStart: parsed.periodStart,
          items: parsed.vendor,
        });
        counts.vendor += n;
      }

      // 5. Import inventory valuation
      if (parsed.weeklyFc.length > 0) {
        setProgress({ current: ++current, total, label: "Import valuasi inventory..." });
        const n = await importInventory({
          reportId,
          branchId,
          valuationDate: parsed.periodEnd,
          items: parsed.weeklyFc,
        });
        counts.inventory += n;
      }

      // 6. Finalize
      setProgress({ current: total, total, label: "Menyelesaikan..." });
      await finalizeReport({
        reportId,
        status: "processed",
        expenseCount: counts.expense,
        salesCount: counts.sales,
        vendorCount: counts.vendor,
        inventoryCount: counts.inventory,
      });

      setResult(counts);
      setStep("done");
      toast.success("Import berhasil!");
    } catch (err) {
      console.error(err);
      toast.error("Terjadi error saat import. Cek console untuk detail.");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setParsed(null);
    setResult(null);
    setProgress({ current: 0, total: 0, label: "" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">Upload Laporan Mingguan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file Excel "NEW LAP" untuk mengisi data expense, penjualan, stok, dan food cost secara otomatis.
        </p>
      </div>

      {/* ─── Step: Idle / Drop ─── */}
      {(step === "idle" || step === "parsing") && (
        <UploadDropzone onFileSelect={handleFileSelect} isLoading={step === "parsing"} />
      )}

      {step === "parsing" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Membaca file Excel...
        </div>
      )}

      {/* ─── Step: Preview ─── */}
      {step === "preview" && parsed && (
        <div className="space-y-4">
          {/* Period info */}
          <div className="rounded-xl border border-border p-4 bg-muted/20 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">File</span>
              <p className="font-medium">{parsed.fileName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Periode</span>
              <p className="font-medium">{parsed.periodStart} → {parsed.periodEnd}</p>
            </div>
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Kas Kecil", count: parsed.lpkk.length, color: "text-orange-600" },
              { label: "Penjualan", count: parsed.penjualan.length, color: "text-primary" },
              { label: "Vendor", count: parsed.vendor.length, color: "text-blue-600" },
              { label: "Food Cost", count: parsed.weeklyFc.length, color: "text-green-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <ImportPreview data={parsed} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleImport}
              disabled={!branchId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import {parsed.lpkk.length + parsed.penjualan.length + parsed.vendor.length + parsed.weeklyFc.length} Record
            </button>
          </div>
        </div>
      )}

      {/* ─── Step: Importing ─── */}
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
          <p className="text-xs text-muted-foreground text-right">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}

      {/* ─── Step: Done ─── */}
      {step === "done" && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <p className="font-semibold">Import Berhasil!</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Expense disimpan", val: result.expense },
              { label: "Penjualan disimpan", val: result.sales },
              { label: "Vendor disimpan", val: result.vendor },
              { label: "Inv. valuasi", val: result.inventory },
            ].map((r) => (
              <div key={r.label} className="text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{r.val}</p>
                <p className="text-xs text-muted-foreground">{r.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Upload File Lainnya
          </button>
        </div>
      )}

      {/* ─── Step: Error ─── */}
      {step === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold">Import Gagal</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Terjadi error saat menyimpan data. Data yang sudah tersimpan mungkin sebagian.
            Cek console browser untuk detail error.
          </p>
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm">
            Coba Lagi
          </button>
        </div>
      )}

      {/* ─── Riwayat Upload ─── */}
      {recentReports && recentReports.length > 0 && step === "idle" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Riwayat Upload
          </h2>
          <div className="space-y-2">
            {recentReports.map((r) => (
              <div
                key={r._id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.periodStart} → {r.periodEnd}
                    {" · "}
                    {r.expenseCount ?? 0} expense, {r.salesCount ?? 0} penjualan
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "processed" ? "bg-green-100 text-green-700" :
                  r.status === "error" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
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
