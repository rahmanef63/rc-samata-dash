"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";
import { parseExcelFile } from "@/features/report-upload/lib/xlsxHelpers";
import {
  parseAllowances,
  extractAllowanceMetadata,
  type AllowanceItem,
} from "@/features/report-upload/parsers/parseAllowances";
import { UploadDropzone } from "@/features/report-upload/components/UploadDropzone";
import { formatRpFull } from "@/shared/lib";
import {
  CheckCircle,
  Loader2,
  Upload,
  AlertCircle,
  Trash2,
  Users,
} from "lucide-react";

type ImportStep = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

export default function UploadTunjanganPage() {
  const [step, setStep] = useState<ImportStep>("idle");
  const [parsed, setParsed] = useState<AllowanceItem[] | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState<{ store: string; area: string; submissionDate: string } | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const existingItems = useQuery(
    api.features.reports.queries.listEmployeeAllowances,
    branchId ? { branchId } : "skip"
  );

  const importBatch = useMutation(api.features.reports.mutations.importAllowancesBatch);
  const deleteBatch = useMutation(api.features.reports.mutations.deleteAllowances);

  // ─── Parse file ─────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setStep("parsing");
    try {
      const wb = await parseExcelFile(file);
      const items = parseAllowances(wb);
      const meta = extractAllowanceMetadata(wb);
      setParsed(items);
      setPeriodLabel(meta.year ? `TAHUN ${meta.year}` : file.name);
      setMetadata({ store: meta.store, area: meta.area, submissionDate: meta.submissionDate });
      setFileName(file.name);
      setStep("preview");
      if (items.length === 0) {
        toast.warning("File dibaca tapi tidak ada data tunjangan karyawan.");
      } else {
        toast.success(`File dibaca: ${items.length} karyawan`);
      }
    } catch {
      toast.error("Gagal membaca file. Pastikan format .xlsx valid.");
      setStep("idle");
    }
  }, []);

  // ─── Import ─────────────────────────────────────────────────

  const runImport = async () => {
    if (!parsed || !branchId) return;
    setStep("importing");
    try {
      const count = await importBatch({
        branchId,
        fileName,
        periodLabel,
        items: parsed,
      });
      setResult(count);
      setStep("done");
      toast.success(`Import berhasil: ${count} karyawan`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saat import.");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("idle");
    setParsed(null);
    setResult(null);
    setPeriodLabel("");
    setFileName("");
    setMetadata(null);
  };

  // ─── Group existing uploads by period ───────────────────────
  const uploadGroups = existingItems
    ? Object.entries(
        existingItems.reduce(
          (acc, item) => {
            const key = item.periodLabel;
            if (!acc[key]) acc[key] = { count: 0, fileName: item.fileName, periodLabel: key };
            acc[key].count++;
            return acc;
          },
          {} as Record<string, { count: number; fileName: string; periodLabel: string }>
        )
      ).map(([, v]) => v)
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Form Tunjangan Khusus</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file Excel &quot;Form Pengajuan Tunjangan Khusus&quot; — tunjangan luar kota, kost, dan subsidi transport.
        </p>
      </div>

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

          {/* ─── Preview ─── */}
          {step === "preview" && parsed && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border p-4 bg-card shadow-sm flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">File</span>
                  <p className="font-medium text-sm truncate" title={fileName}>{fileName}</p>
                </div>
                <div className="rounded-xl border border-border p-4 bg-card shadow-sm flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Periode</span>
                  <p className="font-medium text-sm truncate">{periodLabel || "-"}</p>
                </div>
                {metadata?.store && (
                  <div className="rounded-xl border border-border p-4 bg-card shadow-sm flex flex-col justify-center">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Store / Tgl</span>
                    <p className="font-medium text-sm truncate" title={`${metadata.store} - ${metadata.submissionDate}`}>
                      {metadata.store} <span className="text-muted-foreground text-xs">({metadata.submissionDate})</span>
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-border p-4 bg-card shadow-sm flex flex-col justify-center">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Total Karyawan</span>
                  <p className="font-medium text-2xl text-primary truncate">{parsed.length}</p>
                </div>
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                        {["Nama", "Jabatan", "Store Asal", "Store Penempatan", "Rotasi", "Jarak", "Luar Kota", "Subsidi Transport", "Budget Kos", "Keterangan"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {parsed.map((item, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap">{item.employeeName}</td>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{item.position ?? "-"}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">{item.storeOrigin ?? "-"}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">{item.storePlacement ?? "-"}</td>
                          <td className="px-4 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">{item.rotationType ?? "-"}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">{item.distance ?? "-"}</td>
                          <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">{formatRpFull(item.luarKotaAmount)}</td>
                          <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">{formatRpFull(item.subsidiTransportAmount)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-primary font-semibold whitespace-nowrap">{formatRpFull(item.budgetKosAmount)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate" title={item.kosNote}>{item.kosNote ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={reset} className="px-6 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-medium transition-colors">
                  Batal
                </button>
                <button
                  onClick={runImport}
                  disabled={!branchId || parsed.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  Import {parsed.length} Karyawan
                </button>
              </div>
            </div>
          )}

          {/* ─── Importing ─── */}
          {step === "importing" && (
            <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-4 shadow-sm animate-in fade-in zoom-in-95 duration-300">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
              <p className="text-base font-medium">Menyimpan data tunjangan...</p>
            </div>
          )}

          {/* ─── Done ─── */}
          {step === "done" && result !== null && (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-8 flex flex-col items-center justify-center gap-5 shadow-sm animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-1">Import Berhasil</h3>
                <p className="text-green-600/80 dark:text-green-400/80 font-medium">{result} karyawan telah tersimpan ke database</p>
              </div>
              <button 
                onClick={reset} 
                className="mt-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                Upload File Lainnya
              </button>
            </div>
          )}

          {/* ─── Error ─── */}
          {step === "error" && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 flex flex-col items-center justify-center gap-5 shadow-sm text-center">
               <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-destructive mb-1">Import Gagal</h3>
                <p className="text-destructive/80 font-medium">Terjadi kesalahan saat menyimpan data</p>
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
                <Users className="h-4 w-4 text-primary" />
                Riwayat Tunjangan
              </h2>
            </div>
            <div className="p-2 flex-1 max-h-[600px] overflow-y-auto">
              {uploadGroups.length === 0 ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                   <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                     <Users className="h-6 w-6 text-muted-foreground/50" />
                   </div>
                   <div className="space-y-1">
                     <p className="text-sm font-medium text-foreground">Belum ada riwayat</p>
                     <p className="text-xs text-muted-foreground">Data yang sudah di-upload akan muncul di sini</p>
                   </div>
                 </div>
              ) : (
                <div className="space-y-1">
                  {uploadGroups.map((g) => (
                    <div key={g.periodLabel} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{g.periodLabel}</p>
                        <p className="text-xs text-muted-foreground truncate" title={g.fileName}>{g.fileName} · {g.count} karyawan</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!branchId || !confirm(`Hapus data tunjangan "${g.periodLabel}"?`)) return;
                          await deleteBatch({ branchId, periodLabel: g.periodLabel });
                          toast.success("Data dihapus");
                        }}
                        className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition-all p-2 rounded-lg hover:bg-destructive/10 shrink-0"
                        title="Hapus Data"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
