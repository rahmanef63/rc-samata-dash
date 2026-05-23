"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GitMerge, Search, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { useMatchingReport } from "../api";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";

type Row = {
  payableId: string;
  invoiceDate: string;
  vendorName: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  status: string;
  refPdfFile?: string;
  receiptCount: number;
  paymentDate?: string;
  paymentFile?: string;
  paymentReference?: string;
  description: string;
};

export function MatchingTab() {
  const data = useMatchingReport();
  const [statusFilter, setStatusFilter] = useState<"all" | "matched" | "unmatched" | "partial">("all");

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.map(({ payable, receipts }) => {
      const firstReceipt = receipts[0];
      const remaining = payable.amount - payable.paidAmount;
      return {
        payableId: payable._id,
        invoiceDate: payable.invoiceDate,
        vendorName: payable.vendorName,
        amount: payable.amount,
        paidAmount: payable.paidAmount,
        remaining,
        status: payable.status,
        refPdfFile: payable.refPdfFile,
        receiptCount: receipts.length,
        paymentDate: firstReceipt?.paidDate,
        paymentFile: firstReceipt?.proofFileName,
        paymentReference: firstReceipt?.reference,
        description: payable.description,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "matched") return r.status === "paid";
      if (statusFilter === "unmatched") return r.status === "open";
      if (statusFilter === "partial") return r.status === "partial";
      return true;
    });
  }, [rows, statusFilter]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    filtered,
    ["invoiceDate", "vendorName", "refPdfFile", "paymentFile", "description"],
  );

  const counts = useMemo(() => ({
    total: rows.length,
    matched: rows.filter((r) => r.status === "paid").length,
    partial: rows.filter((r) => r.status === "partial").length,
    unmatched: rows.filter((r) => r.status === "open" || r.status === "overdue").length,
  }), [rows]);

  const exportCsv = () => {
    const header = ["Tanggal Piutang", "Vendor", "Nominal Piutang", "Ref File PDF Name", "Status", "Tanggal Bayar", "Nominal Dibayar", "Sisa", "File Bukti", "Reference"];
    const lines = sortedItems.map((r) => [
      r.invoiceDate, r.vendorName, String(r.amount), r.refPdfFile ?? "",
      r.status, r.paymentDate ?? "", String(r.paidAmount), String(r.remaining),
      r.paymentFile ?? "", r.paymentReference ?? "",
    ].map((c) => /[,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `matching-piutang-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${sortedItems.length} row di-export`);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            Matching Report (Tagihan ↔ Bayar)
          </h2>
          <button
            onClick={exportCsv}
            disabled={sortedItems.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Total Tagihan" value={String(counts.total)} />
          <Stat label="Lunas" value={String(counts.matched)} color="text-green-600" />
          <Stat label="Sebagian" value={String(counts.partial)} color="text-yellow-700" />
          <Stat label="Belum / Telat" value={String(counts.unmatched)} color="text-destructive" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tanggal / vendor / file..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "matched", "partial", "unmatched"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded font-semibold uppercase",
                  statusFilter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {k === "all" ? "Semua" : k === "matched" ? "Lunas" : k === "partial" ? "Sebagian" : "Belum"}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono ml-auto">{sortedItems.length} row</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="text-left">
              <SortableTh label="Tgl Piutang" sortKey="invoiceDate" sort={sort} onSort={toggleSort} />
              <SortableTh label="Vendor" sortKey="vendorName" sort={sort} onSort={toggleSort} />
              <SortableTh label="Nominal" sortKey="amount" sort={sort} onSort={toggleSort} align="right" />
              <SortableTh label="Sudah Bayar" sortKey="paidAmount" sort={sort} onSort={toggleSort} align="right" />
              <SortableTh label="Sisa" sortKey="remaining" sort={sort} onSort={toggleSort} align="right" />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
              <SortableTh label="Tgl Bayar" sortKey="paymentDate" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2 font-semibold text-muted-foreground">PDF Tagihan</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Bukti Bayar</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Belum ada data tagihan</td></tr>
            ) : sortedItems.map((r) => (
              <tr key={r.payableId} className="border-t border-border/40 hover:bg-muted/10 align-top">
                <td className="px-3 py-1.5 font-mono">{r.invoiceDate}</td>
                <td className="px-3 py-1.5 truncate max-w-[180px]" title={r.vendorName}>{r.vendorName}</td>
                <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(r.amount)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{formatRpFull(r.paidAmount)}</td>
                <td className={cn("px-3 py-1.5 text-right font-mono font-semibold", r.remaining > 0 ? "text-destructive" : "text-green-600")}>
                  {formatRpFull(r.remaining)}
                </td>
                <td className="px-3 py-1.5">
                  {r.status === "paid"
                    ? <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold uppercase"><CheckCircle className="h-2.5 w-2.5" /> Lunas</span>
                    : r.status === "partial"
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-semibold uppercase">Sebagian</span>
                    : r.status === "overdue"
                    ? <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold uppercase"><AlertTriangle className="h-2.5 w-2.5" /> Telat</span>
                    : <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold uppercase">Belum</span>}
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px]">{r.paymentDate ?? "—"}</td>
                <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[200px]" title={r.refPdfFile ?? ""}>{r.refPdfFile ?? "—"}</td>
                <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[200px]" title={r.paymentFile ?? ""}>
                  {r.paymentFile ?? "—"}
                  {r.receiptCount > 1 && <span className="ml-1 text-primary">(+{r.receiptCount - 1})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold mt-0.5", color)}>{value}</p>
    </div>
  );
}
