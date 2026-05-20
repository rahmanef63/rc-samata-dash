"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ClipboardPaste, Download, FileText, ScanLine } from "lucide-react";
import { parseFilename, FILENAME_CATEGORY_LABELS, RECEIPT_CATEGORIES, PAYABLE_INVOICE_CATEGORIES, REFERENCE_CATEGORIES, type FilenameCategory } from "../lib/parseFilename";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<FilenameCategory, string> = {
  struk_atm: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  tf_supplier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  tf_piutang: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  tf_royalti: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  tf_gaji: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  banner_promo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  foto_masalah: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  laporan_online: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  update_piutang: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  nota: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  laporan_keuangan: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  daftar_gaji: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
};

export function FilenameScanner() {
  const [text, setText] = useState("");

  const parsed = useMemo(() => {
    if (!text.trim()) return [];
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(parseFilename);
  }, [text]);

  const stats = useMemo(() => {
    const map: Partial<Record<FilenameCategory, number>> = {};
    for (const p of parsed) map[p.category] = (map[p.category] ?? 0) + 1;
    return map;
  }, [parsed]);

  const receiptCount = parsed.filter((p) => RECEIPT_CATEGORIES.has(p.category)).length;
  const invoiceCount = parsed.filter((p) => PAYABLE_INVOICE_CATEGORIES.has(p.category)).length;
  const refCount = parsed.filter((p) => REFERENCE_CATEGORIES.has(p.category)).length;

  const exportReceiptsCsv = () => {
    const header = ["paidDate", "amount", "paidBy", "vendorName", "channel", "reference", "notes", "fileName"];
    const rows = parsed
      .filter((p) => RECEIPT_CATEGORIES.has(p.category))
      .map((p) => {
        const vendorOrEmployee = p.vendor ?? p.employee ?? p.ownerName ?? "";
        const paidBy = p.category === "struk_atm" ? "owner" : "pic";
        return [
          p.date ?? "",
          "", // amount (user fills)
          paidBy,
          vendorOrEmployee,
          "transfer",
          "",
          FILENAME_CATEGORY_LABELS[p.category],
          p.raw,
        ];
      });
    downloadCsv("bukti-bayar-scan.csv", header, rows);
  };

  const exportPayablesCsv = () => {
    const header = ["vendorName", "invoiceDate", "dueDate", "amount", "paidAmount", "description", "reference", "fileName"];
    const rows = parsed
      .filter((p) => PAYABLE_INVOICE_CATEGORIES.has(p.category))
      .map((p) => [
        "", // vendorName (user fills — extracted description often multi-vendor)
        p.period?.start ?? p.date ?? "",
        p.period?.end ?? "",
        "", // amount
        "0",
        p.description ?? "",
        "",
        p.raw,
      ]);
    downloadCsv("penagihan-piutang-scan.csv", header, rows);
  };

  const downloadCsv = (name: string, header: string[], rows: string[][]) => {
    if (rows.length === 0) { toast.error("Tidak ada baris cocok kategori ini"); return; }
    const csv = [header.join(","), ...rows.map((r) => r.map((c) => /[,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} baris di-export ke ${name}`);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Scan Filenames → CSV Scaffold
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste daftar nama file dari chat WhatsApp (1 baris per file). Sistem deteksi kategori, vendor, tanggal otomatis dari nama file. Klik Export CSV → isi kolom amount → upload ke Bulk Import.
          </p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="STRUK-ATM_TF-Owner-Dzikrullah_29042026_20-01.jpg&#10;TF-SUPPLIER_CiomasAdisatwa_01022026_15-05.jpg&#10;00000945-Update piutang 8-14 April 2026 18.05.pdf"
          rows={8}
          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />

        {parsed.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Total File" value={String(parsed.length)} />
              <Stat label="→ Bukti Bayar" value={String(receiptCount)} color="text-green-600" />
              <Stat label="→ Penagihan" value={String(invoiceCount)} color="text-yellow-700" />
              <Stat label="Lainnya" value={String(refCount)} color="text-muted-foreground" />
            </div>

            {Object.keys(stats).length > 0 && (
              <div className="flex gap-1 flex-wrap text-[10px]">
                {Object.entries(stats).map(([k, n]) => (
                  <span key={k} className={cn("px-2 py-0.5 rounded font-semibold", CATEGORY_COLORS[k as FilenameCategory] ?? CATEGORY_COLORS.other)}>
                    {FILENAME_CATEGORY_LABELS[k as FilenameCategory]}: {n}
                  </span>
                ))}
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[40vh] overflow-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-semibold">Kategori</th>
                      <th className="px-2 py-1.5 font-semibold">Vendor / Karyawan</th>
                      <th className="px-2 py-1.5 font-semibold">Tanggal</th>
                      <th className="px-2 py-1.5 font-semibold">Periode</th>
                      <th className="px-2 py-1.5 font-semibold">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i} className="border-t border-border/40 hover:bg-muted/10">
                        <td className="px-2 py-1">
                          <span className={cn("px-1.5 py-0.5 rounded font-semibold", CATEGORY_COLORS[p.category])}>
                            {FILENAME_CATEGORY_LABELS[p.category]}
                          </span>
                        </td>
                        <td className="px-2 py-1 truncate max-w-[180px]" title={p.vendor ?? p.employee ?? p.ownerName ?? p.description}>
                          {p.vendor ?? p.employee ?? p.ownerName ?? "—"}
                        </td>
                        <td className="px-2 py-1 font-mono">{p.date ?? "—"}</td>
                        <td className="px-2 py-1 font-mono text-muted-foreground">
                          {p.period ? `${p.period.start} → ${p.period.end}` : "—"}
                        </td>
                        <td className="px-2 py-1 truncate max-w-[260px] text-muted-foreground" title={p.raw}>{p.raw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportReceiptsCsv}
                disabled={receiptCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 text-xs font-bold hover:bg-green-100 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV Bukti Bayar ({receiptCount})
              </button>
              <button
                onClick={exportPayablesCsv}
                disabled={invoiceCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300 text-xs font-bold hover:bg-yellow-100 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV Penagihan ({invoiceCount})
              </button>
              <button
                onClick={() => setText("")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Bersih
              </button>
            </div>
          </>
        )}

        {parsed.length === 0 && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              <p className="font-semibold">Pola filename yang dikenali:</p>
              <p>• <code className="bg-card px-1 rounded">TF-SUPPLIER_VendorName_DDMMYYYY_HH-MM.jpg</code> → bukti bayar supplier</p>
              <p>• <code className="bg-card px-1 rounded">STRUK-ATM_TF-Owner-NamaOwner_DDMMYYYY_HH-MM.jpg</code> → setoran owner</p>
              <p>• <code className="bg-card px-1 rounded">00000XXX-Update piutang DD-DD Bulan YYYY.pdf</code> → tagihan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}
