"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Property, PropertyValue, SelectOption } from "@/features/notion-shell/types";
import { EntityNotionView, RefreshCw } from "@/features/notion-shell-wrapper/EntityNotionView";
import { LEDGER_CONFIG } from "../lib/config";
import { txToPage, propToColumn, type TxRow } from "../lib/notionAdapter";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// Tag colors auto-assigned per unique file/sheet name. Stable rotation
// keeps the same value the same color across renders.
const FILE_COLORS = ["blue", "green", "purple", "orange", "pink", "teal", "indigo", "cyan"];

function buildDynamicOptions(values: Set<string>, palette: string[]): SelectOption[] {
  return [...values].sort().map((v, i) => ({
    id: v, name: v, color: palette[i % palette.length],
  }));
}

// Buku Besar surface — wraps the unified `transactions` SSOT in the
// generic EntityNotionView. Renders identical to any other entity's
// Notion view (payables / vendors / expenses) — proves the wrapper is
// fully reusable.

export function BukuBesarNotion({ branchId }: { branchId: Id<"branches"> }) {
  const txs = useQuery(api.features.transactions.queries.listTransactions, {
    branchId, limit: 5000,
  }) as TxRow[] | undefined;
  const bulkPatch = useMutation(api.features.transactions.mutations.bulkPatchTransactions);
  const bulkDelete = useMutation(api.features.transactions.mutations.bulkDeleteTransactionsCascade);
  const backfill = useMutation(api.features.transactions.mutations.backfillTransactions);
  const [busy, setBusy] = useState(false);

  // Derive options dinamis dari rows untuk kolom file/sheet — supaya owner
  // bisa filter "tampilkan transaksi dari file X" tanpa harus ketik manual.
  // Plus visual badge per file (warna stable per nilai).
  const properties = useMemo<Property[]>(() => {
    const files = new Set<string>();
    const sheets = new Set<string>();
    const proofs = new Set<string>();
    for (const t of txs ?? []) {
      if (t.sourceFileName) files.add(t.sourceFileName);
      if (t.sourceSheetName) sheets.add(t.sourceSheetName);
      if (t.proofFileName) proofs.add(t.proofFileName);
    }
    const fileOptions = buildDynamicOptions(files, FILE_COLORS);
    const sheetOptions = buildDynamicOptions(sheets, ["green", "teal", "cyan"]);
    const proofOptions = buildDynamicOptions(proofs, ["purple", "pink", "indigo"]);
    return LEDGER_CONFIG.properties.map((p) => {
      if (p.id === "sourceFileName")  return { ...p, type: "select", options: fileOptions  };
      if (p.id === "sourceSheetName") return { ...p, type: "select", options: sheetOptions };
      if (p.id === "proofFileName")   return { ...p, type: "select", options: proofOptions };
      return p;
    });
  }, [txs]);

  const handleBackfill = async () => {
    if (!confirm("Backfill mirror legacy payables/receipts/transfers/closings ke transactions SSOT. Idempotent (aman re-run). Lanjut?")) return;
    setBusy(true);
    try {
      const res = await backfill({ branchId });
      toast.success(`Backfill selesai · ${res.inserted} row di-mirror`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntityNotionView<TxRow>
      config={{
        databaseId: LEDGER_CONFIG.databaseId,
        databaseName: LEDGER_CONFIG.databaseName,
        databaseIcon: LEDGER_CONFIG.databaseIcon,
        properties,
        views: LEDGER_CONFIG.views,
        propToColumn,
        toPage: txToPage,
        exportFilenamePrefix: "buku-besar",
      }}
      rows={txs}
      onRowUpdate={async (rowId: string, column: string, value: PropertyValue) => {
        await bulkPatch({
          branchId,
          patches: [{ id: rowId as Id<"transactions">, data: { [column]: value } }],
        });
      }}
      onBulkPatch={async (patches) => {
        const res = await bulkPatch({
          branchId,
          patches: patches.map((p) => ({ id: p.id as Id<"transactions">, data: p.data })),
        });
        return res;
      }}
      onBulkDelete={async (ids) => {
        const res = await bulkDelete({
          branchId,
          ids: ids as Id<"transactions">[],
        });
        // Cascade also wiped proyeksi (closings/expenses/sales/payables/etc).
        toast.success(`${res.txDeleted} tx + ${res.projDeleted} proyeksi rows dihapus`);
        return { deleted: res.txDeleted };
      }}
      toolbarExtras={
        <button
          onClick={handleBackfill}
          disabled={busy}
          title="Mirror legacy tables ke transactions SSOT — idempotent"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          Backfill Legacy
        </button>
      }
    />
  );
}
