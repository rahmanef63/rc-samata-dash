"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { Download, Upload, Trash2, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { NotionDatabase } from "@/features/notion-shell/components/NotionDatabase";
import type { Database, DatabaseViewConfig, Page, PropertyValue } from "@/features/notion-shell/types";
import { PROPERTIES, buildDatabase, txToPage, propToColumn, type TxRow } from "../lib/notionAdapter";
import { cn } from "@/lib/utils";

// Wraps notion-shell's NotionDatabase with convex bindings so the
// Buku Besar page renders all transactions in a Notion-style surface
// with table / board / list / gallery / calendar / feed views,
// per-cell editing, and multi-row selection.

export function BukuBesarNotion({ branchId }: { branchId: Id<"branches"> }) {
  const txs = useQuery(api.features.transactions.queries.listTransactions, {
    branchId, limit: 5000,
  }) as TxRow[] | undefined;
  const bulkPatch = useMutation(api.features.transactions.mutations.bulkPatchTransactions);
  const bulkDelete = useMutation(api.features.transactions.mutations.bulkDeleteTransactions);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [activeViewId, setActiveViewId] = useState("v_table");

  // Build Database config + Page rows
  const pages: Page[] = useMemo(() => (txs ?? []).map(txToPage), [txs]);
  const database: Database = useMemo(() => {
    const base = buildDatabase(pages.map((p) => p.id));
    return { ...base, activeViewId };
  }, [pages, activeViewId]);

  const handleRowUpdate = useCallback(
    async (rowId: string, propId: string, value: PropertyValue) => {
      const col = propToColumn(propId);
      if (!col) {
        toast.error(`Field "${propId}" tidak bisa di-edit`);
        return;
      }
      try {
        await bulkPatch({
          branchId,
          patches: [{
            id: rowId as Id<"transactions">,
            data: { [col]: value },
          }],
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal update cell");
      }
    },
    [bulkPatch, branchId],
  );

  const handleViewActivate = (viewId: string) => setActiveViewId(viewId);

  const handleViewConfigChange = (_viewId: string, patch: Partial<DatabaseViewConfig>) => {
    // Persisted view config nanti — sekarang ephemeral. Search/sort/filter
    // tetap live via NotionDatabase's internal applyView.
    void patch;
  };

  // ─── Selection (header checkboxes already integrated in TableView when
  // we patch — for now we expose action bar that operates on selected) ──

  const selectedRows = useMemo(
    () => (txs ?? []).filter((t) => selected.has(t._id)),
    [txs, selected],
  );

  const handleExport = () => {
    const target = selectedRows.length > 0 ? selectedRows : (txs ?? []);
    if (target.length === 0) { toast.error("Tidak ada row"); return; }
    const cols = ["_id", ...PROPERTIES.map((p) => p.id)];
    const header = ["_id", ...PROPERTIES.map((p) => p.name)];
    const lines = target.map((r) => cols.map((c) => {
      const v = c === "_id" ? r._id : (r as unknown as Record<string, unknown>)[c];
      const s = v == null ? "" : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buku-besar-${selectedRows.length > 0 ? "selected-" : ""}${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${target.length} row di-export${selectedRows.length > 0 ? " (selected)" : ""}`);
  };

  const handleReplaceUpload = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("CSV kosong atau tanpa data");
        return;
      }
      const header = lines[0].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      const idIdx = header.indexOf("_id");
      if (idIdx < 0) {
        toast.error("CSV tidak punya kolom _id — gunakan file hasil Export Selected");
        return;
      }
      // Map column name → property id (reverse lookup)
      const nameToProp: Record<string, string> = {};
      PROPERTIES.forEach((p) => { nameToProp[p.name] = p.id; });
      const colToProp = header.map((name) => name === "_id" ? null : (nameToProp[name] ?? null));

      const patches: { id: Id<"transactions">; data: Record<string, unknown> }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const id = (cells[idIdx] ?? "").trim() as Id<"transactions">;
        if (!id) continue;
        const data: Record<string, unknown> = {};
        for (let c = 0; c < header.length; c++) {
          if (c === idIdx) continue;
          const propId = colToProp[c];
          if (!propId) continue;
          const col = propToColumn(propId);
          if (!col) continue;
          const raw = cells[c]?.trim() ?? "";
          if (col === "amount" || col === "paidAmount" || col === "sourceRowNumber") {
            const n = Number(raw.replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(n)) data[col] = n;
          } else {
            data[col] = raw;
          }
        }
        patches.push({ id, data });
      }

      if (patches.length === 0) {
        toast.error("Tidak ada row valid di CSV");
        return;
      }

      const res = await bulkPatch({ branchId, patches });
      toast.success(`${res.updated} row di-update${res.errors.length > 0 ? ` · ${res.errors.length} error` : ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`Hapus ${selectedRows.length} row?`)) return;
    setBusy(true);
    try {
      const res = await bulkDelete({
        branchId,
        ids: selectedRows.map((r) => r._id as Id<"transactions">),
      });
      toast.success(`${res.deleted} row dihapus`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk delete gagal");
    } finally {
      setBusy(false);
    }
  };

  if (!txs) {
    return (
      <p className="px-8 py-12 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat transactions...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection toolbar */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <SelectionControl txs={txs} selected={selected} setSelected={setSelected} />
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          Export {selectedRows.length > 0 ? `Selected (${selectedRows.length})` : "Semua"}
        </button>
        <label className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold cursor-pointer",
          busy && "opacity-50 cursor-wait",
        )}>
          <Upload className="h-3.5 w-3.5" />
          Replace via CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleReplaceUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={handleBulkDelete}
          disabled={selectedRows.length === 0 || busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 text-xs font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Bulk Hapus
        </button>
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

// Compact checkbox-list popover for selecting rows by ID. Notion-shell
// itself doesn't expose multi-select hooks yet; pending a Phase M3b
// upgrade we surface selection via a sidebar control. For now: select
// all visible / clear all / toggle by id input.
function SelectionControl({
  txs, selected, setSelected,
}: {
  txs: TxRow[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">Pilih:</span>
      <button
        onClick={() => setSelected(new Set(txs.map((t) => t._id)))}
        className="px-2 py-0.5 rounded border border-border hover:bg-muted/50 font-semibold"
      >
        Semua ({txs.length})
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

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}
