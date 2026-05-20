"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Upload, Loader2, AlertTriangle, FileText } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatRpFull } from "@/shared/lib";
import { parseReceiptsCsv, buildReceiptsCsvTemplate, type ReceiptCsvRow } from "../parsers/parseReceiptsCsv";

export function BulkReceiptsImport({ branchId }: { branchId: Id<"branches"> }) {
  const importBulk = useMutation(api.features.closing.mutations.importPaymentReceiptsBulk);
  const [rows, setRows] = useState<ReceiptCsvRow[]>([]);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [committing, setCommitting] = useState(false);

  const total = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);
  const withVendor = useMemo(() => rows.filter((r) => r.vendorName).length, [rows]);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseReceiptsCsv(text);
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setFileName(file.name);
      toast.success(`Parse ${parsed.rows.length} bukti bayar`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal baca file");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildReceiptsCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-bukti-bayar.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const commit = async () => {
    if (rows.length === 0) return;
    setCommitting(true);
    try {
      const res = await importBulk({
        branchId,
        rows: rows.map((r) => ({
          paidDate: r.paidDate,
          amount: r.amount,
          paidBy: r.paidBy,
          vendorName: r.vendorName,
          channel: r.channel,
          reference: r.reference,
          notes: r.notes,
          fileName: r.fileName,
        })),
      });
      toast.success(`Bukti bayar tersimpan — ${res.inserted} insert · ${res.linked} dilink ke payable`);
      setRows([]);
      setFileName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import gagal");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden space-y-3">
      <div className="px-4 pt-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Bulk Import Bukti Bayar
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload CSV bukti bayar. vendorName di-resolve ke payable open vendor tersebut (FIFO oldest first) → auto-credit paidAmount + status.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
        >
          <FileText className="h-3.5 w-3.5" /> Template
        </button>
      </div>

      <div className="px-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
          className="w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold hover:file:bg-primary/90"
        />
        {fileName && <p className="text-[10px] text-muted-foreground mt-1">File: {fileName}</p>}
      </div>

      {errors.length > 0 && (
        <div className="mx-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-3">
          <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" /> {errors.length} baris gagal di-parse
          </p>
          <ul className="text-[11px] text-yellow-800 dark:text-yellow-300 list-disc list-inside space-y-0.5">
            {errors.slice(0, 5).map((e, i) => <li key={i}>baris {e.line}: {e.message}</li>)}
            {errors.length > 5 && <li>... + {errors.length - 5} lagi</li>}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="px-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-background p-2 text-center">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Baris</p>
              <p className="text-lg font-bold mt-0.5">{rows.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2 text-center">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Bisa Auto-Link</p>
              <p className="text-lg font-bold mt-0.5 text-green-600">{withVendor}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-2 text-center">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total</p>
              <p className="text-sm font-bold mt-0.5">{formatRpFull(total)}</p>
            </div>
          </div>

          <div className="border-y border-border max-h-[40vh] overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/40 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-semibold">Tanggal</th>
                  <th className="px-2 py-1.5 font-semibold">Vendor</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
                  <th className="px-2 py-1.5 font-semibold">Dibayar</th>
                  <th className="px-2 py-1.5 font-semibold">Channel</th>
                  <th className="px-2 py-1.5 font-semibold">File / Ref</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/40 hover:bg-muted/10">
                    <td className="px-2 py-1 font-mono">{r.paidDate}</td>
                    <td className="px-2 py-1 truncate max-w-[180px]" title={r.vendorName}>{r.vendorName ?? <span className="text-muted-foreground italic">—</span>}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.amount)}</td>
                    <td className="px-2 py-1 text-[10px] uppercase font-semibold">{r.paidBy}</td>
                    <td className="px-2 py-1 text-[10px] text-muted-foreground">{r.channel ?? "—"}</td>
                    <td className="px-2 py-1 truncate max-w-[200px] text-muted-foreground" title={r.fileName ?? r.reference ?? ""}>{r.fileName ?? r.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={() => { setRows([]); setErrors([]); setFileName(""); }}
              disabled={committing}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={commit}
              disabled={committing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-bold disabled:opacity-50"
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {committing ? "Menyimpan..." : `Import ${rows.length} Bukti Bayar`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
