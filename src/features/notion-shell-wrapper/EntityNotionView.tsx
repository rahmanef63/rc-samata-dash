"use client";

/**
 * Generic Notion-style view of a Convex-backed table.
 *
 * Wraps notion-shell's NotionDatabase with a standard toolbar
 * (Export CSV / Replace CSV / Bulk Delete / optional Backfill) and
 * binds it to caller-supplied query/mutation hooks. Every feature
 * that wants the Buku Besar-style surface plugs in via this
 * component instead of re-implementing per-feature.
 *
 * Two-way relation: NotionDatabase calls `onRowUpdate` per-cell so
 * each edit is dispatched to a mutation that patches the underlying
 * Convex table. Because Convex queries are reactive, any other view
 * subscribed to the same table (e.g. /finance/buku-besar) refreshes
 * instantly.
 */

import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Upload, Trash2, Loader2, RefreshCw } from "lucide-react";
import { NotionDatabase } from "@/features/notion-shell/components/NotionDatabase";
import type { Database, DatabaseViewConfig, Page, PropertyValue, Property } from "@/features/notion-shell/types";
import { parseCsvText, csvEscape, downloadCsv } from "@/shared/lib/csv";
import { cn } from "@/lib/utils";

export type EntityNotionConfig<T extends { _id: string }> = {
  /** Notion-shell Database metadata. */
  databaseId: string;
  databaseName: string;
  databaseIcon: string;
  properties: Property[];
  views: DatabaseViewConfig[];
  /** Map property id → underlying Convex column name. Return null for read-only. */
  propToColumn: (propId: string) => string | null;
  /** Map entity row → notion Page (title + icon + rowProps). */
  toPage: (row: T) => Page;
  /** Filename prefix for CSV export (date suffix added automatically). */
  exportFilenamePrefix: string;
};

export type EntityNotionViewProps<T extends { _id: string }> = {
  config: EntityNotionConfig<T>;
  rows: T[] | undefined;

  /** Patch a single field on a single row. */
  onRowUpdate: (rowId: string, column: string, value: PropertyValue) => Promise<void>;

  /** Optional — enable Replace via CSV. */
  onBulkPatch?: (patches: Array<{ id: string; data: Record<string, unknown> }>) => Promise<{ updated: number; errors: { id: string; message: string }[] }>;

  /** Optional — enable Bulk Delete. */
  onBulkDelete?: (ids: string[]) => Promise<{ deleted: number }>;

  /** Optional — extra toolbar buttons (e.g. Backfill). */
  toolbarExtras?: React.ReactNode;
};

export function EntityNotionView<T extends { _id: string }>({
  config, rows, onRowUpdate, onBulkPatch, onBulkDelete, toolbarExtras,
}: EntityNotionViewProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [activeViewId, setActiveViewId] = useState(config.views[0]?.id ?? "v_table");

  const pages: Page[] = useMemo(() => (rows ?? []).map(config.toPage), [rows, config]);

  const database: Database = useMemo(() => {
    const now = Date.now();
    return {
      id: config.databaseId,
      name: config.databaseName,
      icon: config.databaseIcon,
      properties: config.properties,
      rowIds: pages.map((p) => p.id),
      views: config.views,
      activeViewId,
      createdAt: now,
      updatedAt: now,
    };
  }, [config, pages, activeViewId]);

  const handleRowUpdate = useCallback(
    async (rowId: string, propId: string, value: PropertyValue) => {
      const col = config.propToColumn(propId);
      if (!col) {
        toast.error(`Field "${propId}" tidak bisa di-edit`);
        return;
      }
      try {
        await onRowUpdate(rowId, col, value);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal update cell");
      }
    },
    [onRowUpdate, config],
  );

  const handleViewActivate = (viewId: string) => setActiveViewId(viewId);
  const handleViewConfigChange = (_viewId: string, _patch: Partial<DatabaseViewConfig>) => {
    // ephemeral; persistence pending Phase M4
    void _patch;
  };

  const selectedRows = useMemo(
    () => (rows ?? []).filter((r) => selected.has(r._id)),
    [rows, selected],
  );

  const handleExport = () => {
    const target = selectedRows.length > 0 ? selectedRows : (rows ?? []);
    if (target.length === 0) { toast.error("Tidak ada row"); return; }
    const cols = ["_id", ...config.properties.map((p) => p.id)];
    const header = ["_id", ...config.properties.map((p) => p.name)];
    const lines = target.map((r) => cols.map((c) => {
      const v = c === "_id" ? r._id : (r as unknown as Record<string, unknown>)[c];
      return csvEscape(v);
    }).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const filename = `${config.exportFilenamePrefix}-${selectedRows.length > 0 ? "selected-" : ""}${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, csv);
    toast.success(`${target.length} row di-export${selectedRows.length > 0 ? " (selected)" : ""}`);
  };

  const handleReplaceUpload = async (file: File) => {
    if (!onBulkPatch) { toast.error("Bulk patch tidak tersedia"); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const { header, rows: csvRows } = parseCsvText(text);
      if (csvRows.length === 0) { toast.error("CSV kosong"); return; }
      const idIdx = header.indexOf("_id");
      if (idIdx < 0) {
        toast.error("CSV tidak punya kolom _id — gunakan file hasil Export Selected");
        return;
      }
      const nameToProp: Record<string, string> = {};
      config.properties.forEach((p) => { nameToProp[p.name] = p.id; });
      const colToProp = header.map((name) => name === "_id" ? null : (nameToProp[name] ?? null));

      const patches: Array<{ id: string; data: Record<string, unknown> }> = [];
      for (const cells of csvRows) {
        const id = (cells[idIdx] ?? "").trim();
        if (!id) continue;
        const data: Record<string, unknown> = {};
        for (let c = 0; c < header.length; c++) {
          if (c === idIdx) continue;
          const propId = colToProp[c];
          if (!propId) continue;
          const col = config.propToColumn(propId);
          if (!col) continue;
          const raw = cells[c]?.trim() ?? "";
          const prop = config.properties.find((p) => p.id === propId);
          if (prop?.type === "number") {
            const n = Number(raw.replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(n)) data[col] = n;
          } else {
            data[col] = raw;
          }
        }
        patches.push({ id, data });
      }
      if (patches.length === 0) { toast.error("Tidak ada row valid"); return; }
      const res = await onBulkPatch(patches);
      toast.success(`${res.updated} row di-update${res.errors.length > 0 ? ` · ${res.errors.length} error` : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedRows.length === 0) return;
    if (!confirm(`Hapus ${selectedRows.length} row?`)) return;
    setBusy(true);
    try {
      const res = await onBulkDelete(selectedRows.map((r) => r._id));
      toast.success(`${res.deleted} row dihapus`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk delete gagal");
    } finally {
      setBusy(false);
    }
  };

  if (!rows) {
    return (
      <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <SelectionControl
          rows={rows}
          selected={selected}
          setSelected={setSelected}
        />
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          Export {selectedRows.length > 0 ? `Selected (${selectedRows.length})` : "Semua"}
        </button>
        {onBulkPatch && (
          <label className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold cursor-pointer",
            busy && "opacity-50 cursor-wait",
          )}>
            <Upload className="h-3.5 w-3.5" />
            Replace via CSV
            <input
              type="file" accept=".csv" className="hidden" disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleReplaceUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {onBulkDelete && (
          <button
            onClick={handleBulkDelete}
            disabled={selectedRows.length === 0 || busy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 text-xs font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Bulk Hapus
          </button>
        )}
        {toolbarExtras && <div className="ml-auto flex items-center gap-2">{toolbarExtras}</div>}
      </div>

      <NotionDatabase
        db={database}
        rows={pages}
        onRowUpdate={handleRowUpdate}
        onViewActivate={handleViewActivate}
        onViewConfigChange={handleViewConfigChange}
      />
    </div>
  );
}

function SelectionControl<T extends { _id: string }>({
  rows, selected, setSelected,
}: {
  rows: T[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">Pilih:</span>
      <button
        onClick={() => setSelected(new Set(rows.map((r) => r._id)))}
        className="px-2 py-0.5 rounded border border-border hover:bg-muted/50 font-semibold"
      >
        Semua ({rows.length})
      </button>
      <button
        onClick={() => setSelected(new Set())}
        disabled={selected.size === 0}
        className="px-2 py-0.5 rounded border border-border hover:bg-muted/50 font-semibold disabled:opacity-50"
      >
        Clear
      </button>
      <span className="ml-1 font-mono text-[10px] text-muted-foreground">
        {selected.size} terpilih
      </span>
    </div>
  );
}

export { RefreshCw };
