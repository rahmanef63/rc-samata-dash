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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            {sel && (
              <th className="w-12 px-0 py-1.5">
                <HeaderCheckboxGutter rowIds={rowIds} />
              </th>
            )}
            {db.properties.filter((p) => !p.hidden).map((p) => (
              <th key={p.id} className="px-3 py-1.5 font-normal">
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
                {db.properties.filter((p) => !p.hidden).map((p) => (
                  <td key={p.id} className="px-3 py-1.5">{renderCell(p, r)}</td>
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
              <td colSpan={db.properties.length + (sel ? 2 : 1)} className="px-3 py-4 text-center text-xs italic text-muted-foreground">
                No rows match
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
