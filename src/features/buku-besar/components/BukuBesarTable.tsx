"use client";

import { useState, useMemo } from "react";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { Search, Pencil, ExternalLink, AlertTriangle } from "lucide-react";
import { formatRpFull } from "@/shared/lib";
import { cn } from "@/lib/utils";
import { KIND_ORDER, KIND_LABEL, KIND_CLS, type RowKind } from "../constants/kind";

export type BukuBesarRow = {
  id: string;
  sourceTable: "payables" | "paymentReceipts" | "ownerTransfers" | "dailyClosings";
  kind: RowKind;
  date: string;
  direction: "in" | "out" | "transfer";
  kategori: string;
  counterparty: string;
  amount: number;
  sisa: number;
  status: string;
  reference: string;
  fileRef: string;
  notes: string;
  anomalyFlag: string;
};

export function BukuBesarTable({
  rows,
  counts,
  selected,
  setSelected,
  onEditRow,
}: {
  rows: BukuBesarRow[];
  counts: Record<RowKind | "total", number> | undefined;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onEditRow: (row: BukuBesarRow) => void;
}) {
  const [kindFilter, setKindFilter] = useState<"all" | RowKind>("all");

  const filtered = useMemo(() => {
    if (kindFilter === "all") return rows;
    return rows.filter((r) => r.kind === kindFilter);
  }, [rows, kindFilter]);

  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    filtered,
    ["date", "counterparty", "reference", "fileRef", "notes", "kategori"],
  );

  const allSelectedVisible = sortedItems.length > 0 && sortedItems.every((r) => selected.has(r.id));
  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allSelectedVisible) {
      sortedItems.forEach((r) => next.delete(r.id));
    } else {
      sortedItems.forEach((r) => next.add(r.id));
    }
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/20 space-y-2">
        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap items-center">
          <ChipBtn label={`Semua (${counts?.total ?? rows.length})`} active={kindFilter === "all"} onClick={() => setKindFilter("all")} />
          {KIND_ORDER.map((k) => {
            const c = counts?.[k] ?? rows.filter((r) => r.kind === k).length;
            return (
              <ChipBtn
                key={k}
                label={`${KIND_LABEL[k]} (${c})`}
                active={kindFilter === k}
                onClick={() => setKindFilter(k)}
                className={kindFilter === k ? KIND_CLS[k] : undefined}
              />
            );
          })}
          <div className="ml-auto flex-1 max-w-sm relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tanggal / vendor / ref / file / catatan..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {sortedItems.length} row{selected.size > 0 ? ` · ${selected.size} dipilih` : ""}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="text-left">
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelectedVisible}
                  onChange={toggleAllVisible}
                  className="h-3.5 w-3.5 accent-primary"
                  title="Pilih semua yang terlihat"
                />
              </th>
              <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2 font-semibold text-muted-foreground">Jenis</th>
              <SortableTh label="Kategori" sortKey="kategori" sort={sort} onSort={toggleSort} />
              <SortableTh label="Counterparty" sortKey="counterparty" sort={sort} onSort={toggleSort} />
              <SortableTh label="Nominal" sortKey="amount" sort={sort} onSort={toggleSort} align="right" />
              <SortableTh label="Sisa" sortKey="sisa" sort={sort} onSort={toggleSort} align="right" />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
              <SortableTh label="Reference" sortKey="reference" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2 font-semibold text-muted-foreground">File Bukti</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Catatan</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-12 text-center text-muted-foreground">Tidak ada transaksi pada filter ini</td></tr>
            ) : sortedItems.map((r) => {
              const isSelected = selected.has(r.id);
              return (
                <tr key={r.id} className={cn("border-t border-border/40 hover:bg-muted/10", isSelected && "bg-primary/5")}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(r.id)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-1.5 font-mono">{r.date}</td>
                  <td className="px-3 py-1.5">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap", KIND_CLS[r.kind])}>
                      {KIND_LABEL[r.kind]}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 truncate max-w-[150px]" title={r.kategori}>{r.kategori}</td>
                  <td className="px-3 py-1.5 truncate max-w-[200px]" title={r.counterparty}>{r.counterparty}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(r.amount)}</td>
                  <td className={cn(
                    "px-3 py-1.5 text-right font-mono",
                    r.sisa > 0 ? "text-destructive font-semibold" :
                    r.sisa < 0 ? "text-yellow-700 font-semibold" :
                    "text-muted-foreground",
                  )}>
                    {r.sisa !== 0 ? formatRpFull(r.sisa) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground">{r.status || "—"}</td>
                  <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]" title={r.reference}>{r.reference || "—"}</td>
                  <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[180px]" title={r.fileRef}>
                    {r.fileRef ? (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        {r.fileRef.length > 22 ? r.fileRef.slice(0, 22) + "…" : r.fileRef}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[200px]" title={r.notes}>
                    {r.anomalyFlag && r.anomalyFlag !== "ok" && (
                      <span className="inline-flex items-center gap-1 mr-1 text-red-700 font-semibold uppercase">
                        <AlertTriangle className="h-2.5 w-2.5" /> {r.anomalyFlag}
                      </span>
                    )}
                    {r.notes || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => onEditRow(r)}
                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      title="Edit row"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChipBtn({ label, active, onClick, className }: { label: string; active: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-1 rounded font-semibold uppercase",
        active
          ? className ?? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {label}
    </button>
  );
}
