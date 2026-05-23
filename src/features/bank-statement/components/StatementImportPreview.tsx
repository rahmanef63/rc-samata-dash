"use client";

import { useState, useMemo } from "react";
import { useTableState } from "@/shared/hooks/useTableState";
import { SortableTh } from "@/shared/components";
import { AlertTriangle, Info, Loader2, Upload, Search } from "lucide-react";
import { TagSelect } from "@/components/ui/tag-select";
import { formatRpFull } from "@/shared/lib";
import { PayableLinkCombo } from "./PayableLinkCombo";
import type { BankStatementRow } from "@/features/report-upload/parsers/parseBankStatement";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  BANK_CATEGORIES, BANK_CATEGORY_LABELS, BANK_CATEGORY_DOT_CLS,
  BANK_CATEGORY_TAG_OPTIONS, type BankCategory,
} from "../constants/categories";

export type EditableBankRow = BankStatementRow & {
  payableId?: Id<"payables">;
  learnAlias?: boolean;
};

type CategoryKey = BankCategory;

export function StatementImportPreview({
  rows,
  fileName,
  uploading,
  onRowsChange,
  onConfirm,
  onCancel,
}: {
  rows: EditableBankRow[];
  fileName: string;
  uploading: boolean;
  onRowsChange: (rows: EditableBankRow[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | CategoryKey>("all");
  const [showWarnings, setShowWarnings] = useState(false);

  const totals = useMemo(() => {
    const counts: Record<string, { count: number; debit: number; credit: number }> = {};
    for (const c of BANK_CATEGORIES) counts[c] = { count: 0, debit: 0, credit: 0 };
    for (const r of rows) {
      const k = (r.category ?? "other") as CategoryKey;
      const bucket = counts[k] ?? counts.other;
      bucket.count++;
      bucket.debit += r.debit;
      bucket.credit += r.kredit;
    }
    return counts;
  }, [rows]);

  const linkedCount = useMemo(() => rows.filter((r) => r.payableId).length, [rows]);

  const warnings = useMemo(() => {
    const w: { level: "warn" | "info"; msg: string }[] = [];
    const otherCount = totals.other?.count ?? 0;
    if (otherCount >= 5) w.push({ level: "warn", msg: `${otherCount} baris masuk "Other" — review kategori sebelum import.` });
    const unlinkedPayments = rows.filter((r) => r.category === "payable_payment" && !r.payableId).length;
    if (unlinkedPayments > 0) w.push({ level: "info", msg: `${unlinkedPayments} payable_payment belum di-link ke payable — bisa di-link via Validator nanti.` });
    const lastBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0;
    if (lastBalance === 0 && rows.length > 0) w.push({ level: "info", msg: "Saldo akhir = 0 — verifikasi statement file utuh." });
    return w;
  }, [rows, totals]);
  const warnCount = warnings.filter((w) => w.level === "warn").length;
  const infoCount = warnings.filter((w) => w.level === "info").length;

  const filteredRows = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => (r.category ?? "other") === activeTab);
  }, [rows, activeTab]);

  const updateRow = (row: EditableBankRow, patch: Partial<EditableBankRow>) => {
    const real = rows.indexOf(row);
    if (real < 0) return;
    const next = rows.slice();
    next[real] = { ...next[real], ...patch };
    onRowsChange(next);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <header className="px-4 pt-4 flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold flex items-center gap-2">
            Preview Statement <span className="text-muted-foreground font-normal truncate" title={fileName}>· {fileName}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} transaksi · {linkedCount} dilink ke payable · review + edit sebelum import.
          </p>
        </div>
      </header>

      {/* Counter cards per category */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {BANK_CATEGORIES.map((key) => {
          const label = BANK_CATEGORY_LABELS[key];
          const t = totals[key];
          return (
            <div key={key} className={cn("rounded-lg border border-border/60 bg-background p-2", t.count === 0 && "opacity-50")}>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", BANK_CATEGORY_DOT_CLS[key])} />
                <p className="text-[10px] font-semibold uppercase tracking-wide truncate" title={label}>{label}</p>
              </div>
              <p className="text-lg font-bold mt-0.5">{t.count}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {t.debit > 0 ? `↓ ${formatRpFull(t.debit)}` : ""}
                {t.debit > 0 && t.credit > 0 ? " · " : ""}
                {t.credit > 0 ? `↑ ${formatRpFull(t.credit)}` : ""}
                {t.debit === 0 && t.credit === 0 ? "—" : ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="px-4 overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-muted p-1 min-w-max">
          <TabBtn label="Semua" count={rows.length} active={activeTab === "all"} onClick={() => setActiveTab("all")} />
          {BANK_CATEGORIES.map((key) => (
            <TabBtn
              key={key}
              label={BANK_CATEGORY_LABELS[key]}
              count={totals[key].count}
              active={activeTab === key}
              onClick={() => setActiveTab(key)}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <PreviewTable rows={filteredRows} onRowChange={updateRow} />

      {/* Warning footer */}
      <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
        {warnings.length > 0 ? (
          <>
            {warnCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-semibold">
                <AlertTriangle className="h-3 w-3" /> {warnCount} peringatan
              </span>
            )}
            {infoCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold">
                <Info className="h-3 w-3" /> {infoCount} info
              </span>
            )}
            <span className="text-xs text-muted-foreground">— tidak memblokir upload</span>
            <button
              onClick={() => setShowWarnings((s) => !s)}
              className="text-xs text-destructive hover:underline ml-auto font-semibold"
            >
              {showWarnings ? "Tutup Detail" : "Lihat Detail"}
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Tidak ada peringatan</span>
        )}
      </div>
      {showWarnings && warnings.length > 0 && (
        <div className="px-4 pb-3">
          <ul className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-xs">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                {w.level === "warn"
                  ? <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 shrink-0" />
                  : <Info className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />}
                <span>{w.msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Commit row */}
      <div className="px-4 pb-4 flex gap-2 border-t border-border pt-3">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={uploading || rows.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-bold disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading
            ? "Mengimport..."
            : `Import ${rows.length} Transaksi${linkedCount > 0 ? ` · ${linkedCount} dilink` : ""}`}
        </button>
      </div>
    </div>
  );
}

function TabBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
        active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="ml-1 opacity-60">({count})</span>
    </button>
  );
}

// ─── Inner table with search + sort via useTableState ──────────

function PreviewTable({
  rows,
  onRowChange,
}: {
  rows: EditableBankRow[];
  onRowChange: (row: EditableBankRow, patch: Partial<EditableBankRow>) => void;
}) {
  const { search, setSearch, sort, toggleSort, sortedItems } = useTableState(
    rows,
    ["txDate", "pihak", "description"],
  );

  return (
    <div className="border-y border-border">
      <div className="px-4 py-2 flex items-center gap-2 bg-muted/20">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tanggal / pihak / deskripsi..."
            className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{sortedItems.length} row</span>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="text-left">
              <SortableTh label="Tanggal" sortKey="txDate" sort={sort} onSort={toggleSort} />
              <SortableTh label="Pihak" sortKey="pihak" sort={sort} onSort={toggleSort} className="min-w-[120px]" />
              <SortableTh label="Deskripsi" sortKey="description" sort={sort} onSort={toggleSort} className="min-w-[160px]" />
              <SortableTh label="Debit" sortKey="debit" sort={sort} onSort={toggleSort} className="text-right" />
              <SortableTh label="Credit" sortKey="kredit" sort={sort} onSort={toggleSort} className="text-right" />
              <SortableTh label="Saldo" sortKey="balance" sort={sort} onSort={toggleSort} className="text-right" />
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Kategori</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground">Link Payable</th>
              <th className="px-2 py-1.5 font-semibold text-muted-foreground text-center">Learn</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Tidak ada baris pada tab ini</td></tr>
            ) : (
              sortedItems.map((r, i) => {
                const cat = (r.category ?? "other") as CategoryKey;
                const catLabel = BANK_CATEGORY_LABELS[cat];
                return (
                  <tr key={i} className="border-t border-border/40 hover:bg-muted/10">
                    <td className="px-2 py-1 font-mono text-[10px]">{r.txDate}</td>
                    <td className="px-1 py-0.5">
                      <input
                        value={r.pihak ?? ""}
                        onChange={(e) => onRowChange(r, { pihak: e.target.value })}
                        placeholder="(pihak)"
                        className="w-full px-1.5 py-0.5 text-[11px] rounded border border-transparent hover:border-border focus:border-primary focus:outline-none bg-transparent"
                      />
                    </td>
                    <td className="px-2 py-1 truncate max-w-[200px]" title={r.description}>{r.description}</td>
                    <td className="px-2 py-1 text-right font-mono text-red-600">{r.debit > 0 ? formatRpFull(r.debit) : ""}</td>
                    <td className="px-2 py-1 text-right font-mono text-green-600">{r.kredit > 0 ? formatRpFull(r.kredit) : ""}</td>
                    <td className="px-2 py-1 text-right font-mono text-muted-foreground">{formatRpFull(r.balance)}</td>
                    <td className="px-1 py-0.5">
                      <TagSelect
                        value={cat}
                        options={BANK_CATEGORY_TAG_OPTIONS}
                        onChange={(v) => v && onRowChange(r, { category: v as BankStatementRow["category"] })}
                        className="min-w-[110px]"
                      />
                    </td>
                    <td className="px-1 py-0.5 min-w-[180px]">
                      {cat === "payable_payment" ? (
                        <PayableLinkCombo
                          value={r.payableId ?? null}
                          debit={r.debit}
                          counterpartyHint={r.pihak}
                          onChange={(id) => onRowChange(r, { payableId: id ?? undefined })}
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic px-1">N/A · {catLabel}</span>
                      )}
                    </td>
                    <td className="px-1 py-0.5 text-center">
                      {r.payableId ? (
                        <input
                          type="checkbox"
                          checked={r.learnAlias ?? false}
                          onChange={(e) => onRowChange(r, { learnAlias: e.target.checked })}
                          className="h-3.5 w-3.5 accent-primary"
                          title="Auto-learn vendor alias dari pihak"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

