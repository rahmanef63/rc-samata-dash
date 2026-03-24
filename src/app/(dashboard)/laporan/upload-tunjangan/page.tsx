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
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">Upload Form Tunjangan Khusus</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file Excel &quot;Form Pengajuan Tunjangan Khusus&quot; — tunjangan luar kota, kost, dan subsidi transport.
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

      {/* ─── Preview ─── */}
      {step === "preview" && parsed && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 bg-muted/20 flex flex-wrap gap-4 text-sm">
            <div><span className="text-muted-foreground text-xs">File</span><p className="font-medium">{fileName}</p></div>
            <div><span className="text-muted-foreground text-xs">Periode</span><p className="font-medium">{periodLabel || "-"}</p></div>
            {metadata?.store && <div><span className="text-muted-foreground text-xs">Store</span><p className="font-medium">{metadata.store}</p></div>}
            {metadata?.submissionDate && <div><span className="text-muted-foreground text-xs">Tanggal Pengajuan</span><p className="font-medium">{metadata.submissionDate}</p></div>}
            <div><span className="text-muted-foreground text-xs">Total Karyawan</span><p className="font-medium">{parsed.length}</p></div>
          </div>

          {/* Preview table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 sticky top-0 z-10">
                  <tr>
                    {["Nama", "Jabatan", "Store Asal", "Store Penempatan", "Rotasi", "Jarak", "Luar Kota", "Subsidi Transport", "Budget Kos", "Keterangan"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((item, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-1.5 font-medium">{item.employeeName}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.position ?? "-"}</td>
                      <td className="px-3 py-1.5">{item.storeOrigin ?? "-"}</td>
                      <td className="px-3 py-1.5">{item.storePlacement ?? "-"}</td>
                      <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{item.rotationType ?? "-"}</td>
                      <td className="px-3 py-1.5">{item.distance ?? "-"}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(item.luarKotaAmount)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(item.subsidiTransportAmount)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-primary font-semibold">{formatRpFull(item.budgetKosAmount)}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.kosNote ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm">Batal</button>
            <button
              onClick={runImport}
              disabled={!branchId || parsed.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import {parsed.length} Karyawan
            </button>
          </div>
        </div>
      )}

      {/* ─── Importing ─── */}
      {step === "importing" && (
        <div className="rounded-xl border border-border p-8 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium">Menyimpan data tunjangan...</p>
        </div>
      )}

      {/* ─── Done ─── */}
      {step === "done" && result !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <p className="font-semibold">Import Berhasil — {result} karyawan tersimpan</p>
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
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-border text-sm">Coba Lagi</button>
        </div>
      )}

      {/* ─── Riwayat Upload ─── */}
      {uploadGroups.length > 0 && step === "idle" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riwayat Tunjangan</h2>
          <div className="space-y-2">
            {uploadGroups.map((g) => (
              <div key={g.periodLabel} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/20 transition-colors">
                <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.fileName}</p>
                  <p className="text-xs text-muted-foreground">{g.periodLabel} · {g.count} karyawan</p>
                </div>
                <button
                  onClick={async () => {
                    if (!branchId || !confirm(`Hapus data tunjangan "${g.periodLabel}"?`)) return;
                    await deleteBatch({ branchId, periodLabel: g.periodLabel });
                    toast.success("Data dihapus");
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                  title="Hapus"
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
