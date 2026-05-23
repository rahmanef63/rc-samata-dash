"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Upload, Loader2, AlertTriangle, FileText } from "lucide-react";
import { useImportLong, useImportPivot } from "../api";
import { parseLaporanPicCsv, classifyTransaksi, type TransaksiRow, type MatchPiutangRow, type Classification } from "../parsers";
import { formatRpFull } from "@/shared/lib";
import { CSV_SHEET as SHEET_TAGS } from "@/shared/constants/sheetNames";
import { cn } from "@/lib/utils";

type ParsedState =
  | { kind: "long"; rows: Array<TransaksiRow & { classification: Classification; anomalyFlag?: "mislabel" | "duplicate" | "not_transfer" | "partial" }> }
  | { kind: "pivot"; rows: MatchPiutangRow[] }
  | null;

const CLASS_LABEL: Record<Classification, string> = {
  payable: "Tagihan (Piutang Vendor)",
  receipt: "Bukti Bayar Vendor",
  owner_transfer_to: "Setoran → Owner",
  owner_transfer_from: "Dana dari Owner",
  anomaly: "Anomali",
};

const CLASS_CLS: Record<Classification, string> = {
  payable: "bg-orange-100 text-orange-700",
  receipt: "bg-green-100 text-green-700",
  owner_transfer_to: "bg-purple-100 text-purple-700",
  owner_transfer_from: "bg-blue-100 text-blue-700",
  anomaly: "bg-red-100 text-red-700",
};

export function ImportLaporanPic() {
  const importLong = useImportLong();
  const importPivot = useImportPivot();
  const [parsed, setParsed] = useState<ParsedState>(null);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [committing, setCommitting] = useState(false);

  const stats = useMemo(() => {
    if (!parsed) return null;
    if (parsed.kind === "long") {
      const counts: Partial<Record<Classification, number>> = {};
      let total = 0;
      for (const r of parsed.rows) {
        counts[r.classification] = (counts[r.classification] ?? 0) + 1;
        total += r.amount;
      }
      return { counts, total, rows: parsed.rows.length };
    } else {
      let matched = 0, unmatched = 0, perluVerif = 0;
      let total = 0;
      for (const r of parsed.rows) {
        if (r.matchStatus === "MATCH_EXACT") matched++;
        else unmatched++;
        if (r.statusRekap && r.statusRekap !== "OK") perluVerif++;
        total += r.amount;
      }
      return { matched, unmatched, perluVerif, total, rows: parsed.rows.length };
    }
  }, [parsed]);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = parseLaporanPicCsv(text);
      setFileName(file.name);
      setErrors(result.errors);
      if (result.kind === "unknown") {
        setParsed(null);
        toast.error(result.errors[0]?.message ?? "Format tidak dikenali");
        return;
      }
      if (result.kind === "long") {
        const enriched = result.rows.map((r) => {
          const c = classifyTransaksi(r);
          return { ...r, classification: c.category, anomalyFlag: c.anomalyFlag };
        });
        setParsed({ kind: "long", rows: enriched });
        toast.success(`Parse ${enriched.length} transaksi (format LONG)`);
      } else {
        setParsed({ kind: "pivot", rows: result.rows });
        toast.success(`Parse ${result.rows.length} matched piutang (format PIVOT)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal baca file");
    }
  };

  const commit = async () => {
    if (!parsed) return;
    setCommitting(true);
    try {
      if (parsed.kind === "long") {
        const rowsWithIdx = parsed.rows.map((r, i) => ({ ...r, sourceRowNumber: i + 2 }));
        const res = await importLong({
          rows: rowsWithIdx,
          sourceFileName: fileName || undefined,
          sourceSheetName: SHEET_TAGS.TRANSAKSI,
        });
        let msg = `Selesai — ${res.payablesCreated} tagihan, ${res.receiptsCreated} bayar (${res.receiptsLinked} linked), ${res.transfersCreated} transfer, ${res.anomaliesCreated} anomali`;
        if (res.unresolved > 0) msg += `, ${res.unresolved} vendor unresolved`;
        toast.success(msg);
        if (res.unresolvedVendors.length > 0) {
          toast.message(`Vendor belum di master: ${res.unresolvedVendors.slice(0, 5).join(", ")}${res.unresolvedVendors.length > 5 ? "..." : ""}`);
        }
      } else {
        const rowsWithIdx = parsed.rows.map((r, i) => ({ ...r, sourceRowNumber: i + 2 }));
        const res = await importPivot({
          rows: rowsWithIdx,
          sourceFileName: fileName || undefined,
          sourceSheetName: SHEET_TAGS.MATCH_PIUTANG,
        });
        let msg = `Selesai — ${res.payablesCreated} tagihan, ${res.receiptsCreated} bayar matched`;
        if (res.unresolved > 0) msg += `, ${res.unresolved} vendor unresolved`;
        toast.success(msg);
        if (res.unresolvedVendors.length > 0) {
          toast.message(`Vendor belum di master: ${res.unresolvedVendors.slice(0, 5).join(", ")}${res.unresolvedVendors.length > 5 ? "..." : ""}`);
        }
      }
      setParsed(null); setFileName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import gagal");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden space-y-3">
      <div className="px-4 pt-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Import CSV Laporan PIC
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Auto-detect format: <b>LONG</b> (paidDate, amount, paidBy, vendorName...) atau <b>PIVOT</b> (Tanggal Piutang, Vendor, Nominal, Match Status...). Sistem klasifikasi tiap row → payable / bukti bayar / transfer owner / anomali, lalu auto-link bayar ke tagihan vendor (FIFO).
        </p>
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

      {parsed && stats && (
        <>
          {/* Stat counters */}
          <div className="px-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {parsed.kind === "long" ? (
              <>
                {(["payable", "receipt", "owner_transfer_to", "owner_transfer_from", "anomaly"] as const).map((k) => (
                  <div key={k} className={cn("rounded-lg border border-border/60 bg-background p-2", (stats.counts?.[k] ?? 0) === 0 && "opacity-40")}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide truncate" title={CLASS_LABEL[k]}>{CLASS_LABEL[k]}</p>
                    <p className="text-lg font-bold mt-0.5">{stats.counts?.[k] ?? 0}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                <Stat label="Total Row" value={String(stats.rows)} />
                <Stat label="Matched" value={String(stats.matched)} color="text-green-600" />
                <Stat label="Unmatched" value={String(stats.unmatched)} color="text-yellow-700" />
                <Stat label="Perlu Verifikasi" value={String(stats.perluVerif)} color="text-orange-600" />
                <Stat label="Total Nominal" value={formatRpFull(stats.total)} />
              </>
            )}
          </div>

          {/* Preview table */}
          <div className="border-y border-border max-h-[40vh] overflow-auto">
            {parsed.kind === "long" ? (
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-semibold">Tanggal</th>
                    <th className="px-2 py-1.5 font-semibold">Vendor</th>
                    <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
                    <th className="px-2 py-1.5 font-semibold">Klasifikasi</th>
                    <th className="px-2 py-1.5 font-semibold">Anomali</th>
                    <th className="px-2 py-1.5 font-semibold">Ref / Akun</th>
                    <th className="px-2 py-1.5 font-semibold">File</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/40 hover:bg-muted/10">
                      <td className="px-2 py-1 font-mono">{r.paidDate}</td>
                      <td className="px-2 py-1 truncate max-w-[160px]" title={r.vendorName}>{r.vendorName}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.amount)}</td>
                      <td className="px-2 py-1">
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", CLASS_CLS[r.classification])}>
                          {CLASS_LABEL[r.classification]}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground uppercase">{r.anomalyFlag ?? "—"}</td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground truncate max-w-[140px]" title={r.reference ?? ""}>{r.reference ?? "—"}</td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground truncate max-w-[180px]" title={r.fileName ?? ""}>{r.fileName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-semibold">Tgl Piutang</th>
                    <th className="px-2 py-1.5 font-semibold">Vendor</th>
                    <th className="px-2 py-1.5 font-semibold text-right">Nominal</th>
                    <th className="px-2 py-1.5 font-semibold">Match</th>
                    <th className="px-2 py-1.5 font-semibold">Tgl Bayar</th>
                    <th className="px-2 py-1.5 font-semibold">File Bukti</th>
                    <th className="px-2 py-1.5 font-semibold">Status Rekap</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/40 hover:bg-muted/10">
                      <td className="px-2 py-1 font-mono">{r.invoiceDate}</td>
                      <td className="px-2 py-1 truncate max-w-[160px]" title={r.vendor}>{r.vendor}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatRpFull(r.amount)}</td>
                      <td className="px-2 py-1">
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold",
                          r.matchStatus === "MATCH_EXACT" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700",
                        )}>
                          {r.matchStatus}
                        </span>
                      </td>
                      <td className="px-2 py-1 font-mono text-[10px]">{r.paymentDate ?? "—"}</td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground truncate max-w-[180px]" title={r.paymentFile ?? ""}>{r.paymentFile ?? "—"}</td>
                      <td className="px-2 py-1 text-[10px] text-muted-foreground truncate max-w-[120px]" title={r.statusRekap ?? ""}>{r.statusRekap === "OK" ? "OK" : (r.statusRekap?.split(" - ")[0] ?? "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={() => { setParsed(null); setErrors([]); setFileName(""); }}
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
              {committing ? "Mengimport..." : `Import ${stats.rows} Row`}
            </button>
          </div>
        </>
      )}

      {!parsed && errors.length === 0 && (
        <div className="mx-4 mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
            <p><b>Format LONG</b> (CSV 2): kolom <code className="bg-card px-1 rounded">paidDate, amount, paidBy, vendorName, channel, reference, notes, fileName</code>. paidBy: <code>pic</code>/<code>pic2</code>/<code>vendor</code>/<code>other</code>.</p>
            <p><b>Format PIVOT</b> (CSV 1): kolom <code className="bg-card px-1 rounded">Tanggal Piutang, Vendor, Nominal Piutang, Ref File PDF Name, Status Rekap, Match Status, Matched Payment Date, ..., Keterangan</code>.</p>
            <p>Sistem auto-detect dari header CSV. Vendor di-resolve fuzzy match ke master vendor.</p>
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
