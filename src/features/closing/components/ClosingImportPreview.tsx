"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { AlertTriangle, Info, Loader2, Upload, FileText, Search } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";
import { parseClosingCsv, buildClosingCsvTemplate, type ClosingCsvRow } from "../parsers/parseClosingCsv";

export function ClosingImportPreview() {
  const importClosings = useMutation(api.features.closing.mutations.importDailyClosings);
  const [rows, setRows] = useState<ClosingCsvRow[]>([]);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [committing, setCommitting] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseClosingCsv(text);
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setFileName(file.name);
      if (parsed.rows.length === 0 && parsed.errors.length > 0) {
        toast.error(parsed.errors[0].message);
      } else {
        toast.success(`Parse ${parsed.rows.length} row dari ${file.name}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal baca file");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildClosingCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-setoran.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => ({
    rows: rows.length,
    cashSales: rows.reduce((s, r) => s + r.cashSales, 0),
    nonCashSales: rows.reduce((s, r) => s + r.nonCashSales, 0),
    actualCash: rows.reduce((s, r) => s + r.actualCash, 0),
    differenceTotal: rows.reduce((s, r) => s + r.difference, 0),
    diffPositive: rows.filter((r) => r.difference > 0).length,
    diffNegative: rows.filter((r) => r.difference < 0).length,
  }), [rows]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    rows,
    ["businessDate", "note"],
  );

  const commit = async () => {
    if (rows.length === 0) return;
    setCommitting(true);
    try {
      const res = await importClosings({
        submittedBy: "csv-import",
        rows: rows.map((r) => ({
          businessDate: r.businessDate,
          openingCash: r.openingCash,
          cashSales: r.cashSales,
          nonCashSales: r.nonCashSales,
          expensesPaidCash: r.expensesPaidCash,
          actualCash: r.actualCash,
          expectedCash: r.expectedCash,
          difference: r.difference,
          note: r.note,
        })),
      });
      toast.success(`Setoran tersimpan — ${res.inserted} baru, ${res.updated} update, ${res.skipped} skip`);
      if (res.skipDetails.length > 0) {
        toast.message(`Skip: ${res.skipDetails.map((s) => s.businessDate).join(", ")} (sudah verified)`);
      }
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
            Import CSV Setoran Harian
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload file CSV setoran harian. Sistem upsert per tanggal — kalau sudah ada (status &quot;submitted&quot;) ditimpa, kalau &quot;verified&quot; di-skip.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
        >
          <FileText className="h-3.5 w-3.5" />
          Template CSV
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
        {fileName && (
          <p className="text-[10px] text-muted-foreground mt-1">File: {fileName}</p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mx-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-3">
          <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" /> {errors.length} baris gagal di-parse
          </p>
          <ul className="text-[11px] text-yellow-800 dark:text-yellow-300 space-y-0.5 list-disc list-inside">
            {errors.slice(0, 5).map((e, i) => (
              <li key={i}>baris {e.line}: {e.message}</li>
            ))}
            {errors.length > 5 && <li>... + {errors.length - 5} lagi</li>}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Hari" value={String(totals.rows)} />
            <Stat label="Cash Sales" value={formatRpFull(totals.cashSales)} color="text-green-600" />
            <Stat label="Non-Cash Sales" value={formatRpFull(totals.nonCashSales)} color="text-blue-600" />
            <Stat
              label="Total Selisih"
              value={formatRpFull(totals.differenceTotal)}
              color={totals.differenceTotal === 0 ? "text-muted-foreground" : totals.differenceTotal > 0 ? "text-green-600" : "text-destructive"}
            />
          </div>

          <div className="border-y border-border">
            <div className="px-4 py-2 flex items-center gap-2 bg-muted/20">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari tanggal / catatan..."
                  className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{sortedItems.length} row · {totals.diffPositive} surplus · {totals.diffNegative} minus</span>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr className="text-left">
                    <SortableTh label="Tanggal" sortKey="businessDate" sort={sort} onSort={toggleSort} />
                    <SortableTh label="Opening" sortKey="openingCash" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="Cash Sales" sortKey="cashSales" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="Non-Cash" sortKey="nonCashSales" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="Expense Cash" sortKey="expensesPaidCash" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="Expected" sortKey="expectedCash" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="Actual" sortKey="actualCash" sort={sort} onSort={toggleSort} align="right" />
                    <SortableTh label="Selisih" sortKey="difference" sort={sort} onSort={toggleSort} align="right" />
                    <th className="px-2 py-1.5 font-semibold text-muted-foreground">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((r) => (
                    <tr key={r.businessDate} className="border-t border-border/40 hover:bg-muted/10">
                      <td className="px-2 py-1 font-mono">{r.businessDate}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.openingCash)}</td>
                      <td className="px-2 py-1 text-right font-mono text-green-700">{formatRpFull(r.cashSales)}</td>
                      <td className="px-2 py-1 text-right font-mono text-blue-700">{formatRpFull(r.nonCashSales)}</td>
                      <td className="px-2 py-1 text-right font-mono text-red-700">{formatRpFull(r.expensesPaidCash)}</td>
                      <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatRpFull(r.expectedCash)}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.actualCash)}</td>
                      <td className={cn("px-2 py-1 text-right font-mono font-semibold",
                        r.difference === 0 ? "text-muted-foreground" : r.difference > 0 ? "text-green-700" : "text-destructive",
                      )}>
                        {r.difference > 0 ? "+" : ""}{formatRpFull(r.difference)}
                      </td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground truncate max-w-[160px]" title={r.note}>{r.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-4 pb-4 flex items-center gap-2">
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
              {committing ? "Menyimpan..." : `Import ${rows.length} Setoran`}
            </button>
          </div>
        </>
      )}

      {rows.length === 0 && errors.length === 0 && (
        <div className="mx-4 mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold">Format CSV:</p>
            <p>Kolom wajib: <code className="bg-card px-1 rounded">businessDate, openingCash, cashSales, nonCashSales, expensesPaidCash, actualCash</code>. Opsional: kolom channel (gofood, grabfood, shopeefood, ovo, dana, qris), customerCount, note. Download template untuk contoh.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}
