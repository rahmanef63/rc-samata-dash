"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatRpFull } from "@/shared/lib";

// Cell formatters shared by the weekly-report tab tables.
export const rp = (v: unknown) => (typeof v === "number" ? formatRpFull(v) : "—");
export const num = (v: unknown) => (typeof v === "number" ? v.toLocaleString("id-ID") : "—");
export const pct = (v: unknown) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—");

function RowSourceDialog({
  row,
  sheet,
  sourceFile,
  reportPeriod,
  onClose,
}: {
  row: Record<string, unknown> | null;
  sheet: string;
  sourceFile?: string;
  reportPeriod?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Sumber baris</DialogTitle>
          <DialogDescription className="text-xs space-y-0.5">
            <span className="block">Sheet: <span className="font-mono">{sheet}</span></span>
            {sourceFile && <span className="block truncate">File: <span className="font-mono">{sourceFile}</span></span>}
            {reportPeriod && <span className="block">Periode: {reportPeriod}</span>}
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="space-y-1.5 text-sm">
            {Object.entries(row)
              .filter(([k]) => !k.startsWith("_"))
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 py-1 border-b border-dashed last:border-0">
                  <span className="text-xs text-muted-foreground font-mono col-span-1 truncate">{k}</span>
                  <span className="col-span-2 font-mono text-xs break-all">
                    {typeof v === "number"
                      ? v.toLocaleString("id-ID")
                      : v == null
                      ? "—"
                      : String(v)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DataTablePanel<T extends Record<string, unknown>>({
  data,
  loading,
  columns,
  sheet,
  sourceFile,
  reportPeriod,
}: {
  data: T[];
  loading?: boolean;
  columns: { key: keyof T & string; label: string; align?: "left" | "right"; format?: (v: unknown) => string }[];
  sheet: string;
  sourceFile?: string;
  reportPeriod?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Tidak ada data yang cocok dengan filter tanggal.
      </Card>
    );
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => {
                const isActive = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => handleSort(c.key)}
                    className={`px-3 py-2 cursor-pointer select-none hover:bg-muted/60 transition-colors ${c.align === "right" ? "text-right" : "text-left"}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                      {c.label}
                      <span className="text-[10px] opacity-60">
                        {isActive ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                data-row-idx={i}
                className="border-t hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => setSelectedRow(row)}
                title="Klik untuk lihat sumber baris"
              >
                {columns.map((c) => {
                  const raw = row[c.key];
                  const display = c.format ? c.format(raw) : String(raw ?? "—");
                  return (
                    <td
                      key={c.key}
                      className={`px-3 py-2 ${c.align === "right" ? "text-right font-mono-data" : ""}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RowSourceDialog
        row={selectedRow}
        sheet={sheet}
        sourceFile={sourceFile}
        reportPeriod={reportPeriod}
        onClose={() => setSelectedRow(null)}
      />
    </Card>
  );
}
