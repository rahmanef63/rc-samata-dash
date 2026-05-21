"use client";

/** TableView — Notion-canonical table layout. Pre-filtered rows in;
 *  cells delegated to host via renderCell. Header optionally wrapped by
 *  renderColumnHeader (typically ColumnHeaderMenu).
 *
 *  Adds optional row-selection gutter when a RowSelectionProvider is
 *  mounted above (e.g. by EntityNotionView). When absent, no gutter
 *  is rendered — view stays usable in contexts that don't care about
 *  selection. */

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRowSelectionOptional, HeaderCheckboxGutter, RowCheckbox } from "../../row-selection";
import { cn } from "@/lib/utils";
import type { ViewProps } from "./types";

export function TableView({
  db, rows, readOnly, onRowUpdate: _onRowUpdate, onRowRemove,
  renderCell, renderColumnHeader,
}: ViewProps) {
  const sel = useRowSelectionOptional();
  const rowIds = rows.map((r) => r.id);

  // Column width heuristic per type — auto-adjust biar tabel gak ketat &
  // tetap muat content. Date column lebih lebar untuk format "7 Jan 2026".
  // Number/currency rata kanan biar enak baca angka.
  const widthFor = (type: string): string => {
    switch (type) {
      case "date":
      case "created_time":
      case "last_edited_time": return "min-w-[150px]";
      case "number":           return "min-w-[120px]";
      case "select":
      case "status":           return "min-w-[140px]";
      case "multi_select":     return "min-w-[180px]";
      case "checkbox":         return "min-w-[80px]";
      case "url":
      case "email":            return "min-w-[200px]";
      case "phone":            return "min-w-[140px]";
      case "rollup":
      case "formula":          return "min-w-[120px]";
      case "relation":         return "min-w-[180px]";
      default:                 return "min-w-[160px]";
    }
  };
  const cellAlign = (type: string): string =>
    (type === "number" || type === "rollup" || type === "formula") ? "text-right tabular-nums" : "";
  const visibleProps = db.properties.filter((p) => !p.hidden);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ tableLayout: "auto" }}>
        <thead className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            {sel && (
              <th className="w-12 px-0 py-1.5">
                <HeaderCheckboxGutter rowIds={rowIds} />
              </th>
            )}
            {visibleProps.map((p) => (
              <th key={p.id} className={cn("px-3 py-1.5 font-normal whitespace-nowrap", widthFor(p.type))}>
                {renderColumnHeader ? renderColumnHeader(p) : (
                  <span className="truncate">{p.name}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const checked = sel ? sel.isSelected(r.id) : false;
            return (
              <tr
                key={r.id}
                className={cn(
                  "group/row border-b border-border/60 hover:bg-accent/30",
                  checked && "bg-primary/5",
                )}
              >
                {sel && (
                  <td className="w-12 px-0 py-1.5">
                    <div className="flex items-center justify-center">
                      <RowCheckbox rowId={r.id} />
                    </div>
                  </td>
                )}
                {visibleProps.map((p) => (
                  <td key={p.id} className={cn("px-3 py-1.5 align-top", widthFor(p.type), cellAlign(p.type))}>
                    {renderCell(p, r)}
                  </td>
                ))}
                {!readOnly && onRowRemove && (
                  <td className="px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRowRemove(r.id)}
                      className="h-5 w-5 text-muted-foreground/40 opacity-0 group-hover/row:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={visibleProps.length + (sel ? 2 : 1)} className="px-3 py-4 text-center text-xs italic text-muted-foreground">
                Tidak ada baris yang cocok
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
