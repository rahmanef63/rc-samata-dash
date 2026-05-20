"use client";

import { useMemo, useState } from "react";
import { History, Search, ExternalLink } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useRiwayatTransaksi } from "../api";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  date: string;
  kind: "tagihan" | "bayar" | "transfer_owner";
  vendor: string;
  amount: number;
  status: string;
  reference?: string;
  fileRef?: string;
  notes?: string;
  anomaly?: string;
};

const KIND_CLS: Record<Row["kind"], string> = {
  tagihan: "bg-orange-100 text-orange-700",
  bayar: "bg-green-100 text-green-700",
  transfer_owner: "bg-purple-100 text-purple-700",
};

const KIND_LABEL: Record<Row["kind"], string> = {
  tagihan: "Tagihan",
  bayar: "Bayar",
  transfer_owner: "Transfer Owner",
};

export function RiwayatTransaksi({ branchId }: { branchId: Id<"branches"> }) {
  const data = useRiwayatTransaksi(branchId);
  const [kindFilter, setKindFilter] = useState<"all" | Row["kind"]>("all");
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const out: Row[] = [];
    for (const p of data.payables) {
      out.push({
        key: `p:${p._id}`,
        date: p.invoiceDate,
        kind: "tagihan",
        vendor: p.vendorName,
        amount: p.amount,
        status: p.status,
        reference: p.paymentReference,
        fileRef: p.refPdfFile,
        notes: p.description,
      });
    }
    for (const r of data.receipts) {
      out.push({
        key: `r:${r._id}`,
        date: r.paidDate,
        kind: "bayar",
        vendor: r.payableId ? "(linked)" : "(tanpa link)",
        amount: r.amount,
        status: r.payableId ? "linked" : "unlinked",
        reference: r.reference ?? r.bankAccount,
        fileRef: r.proofFileName,
        notes: r.notes,
        anomaly: r.anomalyFlag && r.anomalyFlag !== "ok" ? r.anomalyFlag : undefined,
      });
    }
    for (const t of data.transfers) {
      out.push({
        key: `t:${t._id}`,
        date: t.transferDate,
        kind: "transfer_owner",
        vendor: t.direction === "branch_to_owner" ? "→ Owner" : "← Owner",
        amount: t.amount,
        status: t.status,
        reference: t.referenceNo,
        notes: t.description,
      });
    }
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (anomalyOnly && !r.anomaly) return false;
      return true;
    });
  }, [rows, kindFilter, anomalyOnly]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    filtered,
    ["date", "vendor", "reference", "fileRef", "notes"],
  );

  const totals = useMemo(() => {
    const out: Record<Row["kind"], { count: number; total: number }> = {
      tagihan: { count: 0, total: 0 },
      bayar: { count: 0, total: 0 },
      transfer_owner: { count: 0, total: 0 },
    };
    for (const r of rows) {
      out[r.kind].count++;
      out[r.kind].total += r.amount;
    }
    return out;
  }, [rows]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Riwayat Transaksi
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">{sortedItems.length} / {rows.length} row</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["tagihan", "bayar", "transfer_owner"] as const).map((k) => (
            <div key={k} className="rounded-lg border border-border/60 bg-background p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{KIND_LABEL[k]}</p>
              <p className="text-sm font-bold">{totals[k].count} · {formatRpFull(totals[k].total)}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tanggal / vendor / ref / file..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "all" | Row["kind"])}
            className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card"
          >
            <option value="all">Semua jenis</option>
            <option value="tagihan">Tagihan</option>
            <option value="bayar">Bayar</option>
            <option value="transfer_owner">Transfer Owner</option>
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => setAnomalyOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span>Hanya anomali</span>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="text-left">
              <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2 font-semibold text-muted-foreground">Jenis</th>
              <SortableTh label="Vendor / Pihak" sortKey="vendor" sort={sort} onSort={toggleSort} />
              <SortableTh label="Nominal" sortKey="amount" sort={sort} onSort={toggleSort} align="right" />
              <th className="px-3 py-2 font-semibold text-muted-foreground">Status</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Anomali</th>
              <SortableTh label="Ref / Akun" sortKey="reference" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2 font-semibold text-muted-foreground">File</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Belum ada transaksi</td></tr>
            ) : sortedItems.map((r) => (
              <tr key={r.key} className="border-t border-border/40 hover:bg-muted/10">
                <td className="px-3 py-1.5 font-mono">{r.date}</td>
                <td className="px-3 py-1.5">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", KIND_CLS[r.kind])}>
                    {KIND_LABEL[r.kind]}
                  </span>
                </td>
                <td className="px-3 py-1.5 truncate max-w-[200px]" title={r.vendor}>{r.vendor}</td>
                <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(r.amount)}</td>
                <td className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground">{r.status}</td>
                <td className="px-3 py-1.5">
                  {r.anomaly && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-700 uppercase">
                      {r.anomaly}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]" title={r.reference ?? ""}>{r.reference ?? "—"}</td>
                <td className="px-3 py-1.5">
                  {r.fileRef ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[180px]" title={r.fileRef}>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      {r.fileRef.length > 28 ? r.fileRef.slice(0, 28) + "…" : r.fileRef}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
