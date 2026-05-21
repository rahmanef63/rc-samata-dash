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
import { RowSelectionProvider, useRowSelection } from "@/features/notion-shell/row-selection";
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

export function EntityNotionView<T extends { _id: string }>(props: EntityNotionViewProps<T>) {
  const rowOrder = useMemo(() => (props.rows ?? []).map((r) => r._id), [props.rows]);
  return (
    <RowSelectionProvider rowOrder={rowOrder}>
      <EntityNotionViewInner {...props} />
    </RowSelectionProvider>
  );
}

function EntityNotionViewInner<T extends { _id: string }>({
  config, rows, onRowUpdate, onBulkPatch, onBulkDelete, toolbarExtras,
}: EntityNotionViewProps<T>) {
  const sel = useRowSelection();
  const [busy, setBusy] = useState(false);
  const [activeViewId, setActiveViewId] = useState(config.views[0]?.id ?? "v_table");

  // Local view overrides — patches that the user accumulates by typing in
  // search, toggling sort, picking filter. Keyed by view id, shallow-merged
  // onto config.views[i] when computing the Database we pass to NotionDatabase.
  // Lives in component state (ephemeral, per-session) — persistence to DB
  // not required for these UX-level controls.
  const [viewOverrides, setViewOverrides] = useState<Record<string, Partial<DatabaseViewConfig>>>({});

  const pages: Page[] = useMemo(() => (rows ?? []).map(config.toPage), [rows, config]);

  const database: Database = useMemo(() => {
    const now = Date.now();
    const mergedViews: DatabaseViewConfig[] = config.views.map((v) => {
      const ov = viewOverrides[v.id];
      return ov ? ({ ...v, ...ov } as DatabaseViewConfig) : v;
    });
    return {
      id: config.databaseId,
      name: config.databaseName,
      icon: config.databaseIcon,
      properties: config.properties,
      rowIds: pages.map((p) => p.id),
      views: mergedViews,
      activeViewId,
      createdAt: now,
      updatedAt: now,
    };
  }, [config, pages, activeViewId, viewOverrides]);

  const handleRowUpdate = useCallback(
    async (rowId: string, propId: string, value: PropertyValue) => {
      const col = config.propToColumn(propId);
      if (!col) {
        toast.error(`Field "${propId}" tidak bisa di-edit`);
        return;
      }
      // Convex's v.optional() validators reject `null` outright — they
      // accept either `undefined` or a literal of the union. Notion's
      // select/checkbox cells emit `null` when cleared. Translate to
      // a sensible per-type default so the mutation accepts the patch.
      const prop = config.properties.find((p) => p.id === propId);
      let safeValue: unknown = value;
      if (value === null) {
        if (prop?.type === "text") safeValue = "";
        else if (prop?.type === "number") safeValue = 0;
        else if (prop?.type === "checkbox") safeValue = false;
        else return; // select/date — skip the patch entirely
      }
      try {
        await onRowUpdate(rowId, col, safeValue as PropertyValue);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal update cell");
      }
    },
    [onRowUpdate, config],
  );

  const handleViewActivate = (viewId: string) => setActiveViewId(viewId);
  const handleViewConfigChange = (viewId: string, patch: Partial<DatabaseViewConfig>) => {
    // Shallow-merge into viewOverrides; database useMemo picks it up next
    // render so search / sort / filter apply immediately via applyView().
    setViewOverrides((prev) => ({
      ...prev,
      [viewId]: { ...(prev[viewId] ?? {}), ...patch },
    }));
  };

  const selectedRows = useMemo(
    () => (rows ?? []).filter((r) => sel.isSelected(r._id)),
    [rows, sel],
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
      sel.clear();
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
        <SelectionStatus rows={rows} />
        <button
          onClick={() => sel.setIds(rows.map((r) => r._id))}
          className="px-2 py-0.5 rounded border border-border hover:bg-muted/50 text-xs font-semibold"
        >
          Pilih Semua
        </button>
        <button
          onClick={() => sel.clear()}
          disabled={sel.count === 0}
          className="px-2 py-0.5 rounded border border-border hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
        >
          Clear
        </button>
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

function SelectionStatus<T extends { _id: string }>({ rows }: { rows: T[] }) {
  const sel = useRowSelection();
  return (
    <span className="font-mono text-[10px] text-muted-foreground">
      {sel.count} / {rows.length} terpilih
    </span>
  );
}

export { RefreshCw };
