"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView, RefreshCw } from "@/features/notion-shell-wrapper/EntityNotionView";
import { LEDGER_CONFIG } from "../lib/config";
import { txToPage, propToColumn, type TxRow } from "../lib/notionAdapter";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Buku Besar surface — wraps the unified `transactions` SSOT in the
// generic EntityNotionView. Renders identical to any other entity's
// Notion view (payables / vendors / expenses) — proves the wrapper is
// fully reusable.

export function BukuBesarNotion({ branchId }: { branchId: Id<"branches"> }) {
  const txs = useQuery(api.features.transactions.queries.listTransactions, {
    branchId, limit: 5000,
  }) as TxRow[] | undefined;
  const bulkPatch = useMutation(api.features.transactions.mutations.bulkPatchTransactions);
  const bulkDelete = useMutation(api.features.transactions.mutations.bulkDeleteTransactions);
  const backfill = useMutation(api.features.transactions.mutations.backfillTransactions);
  const [busy, setBusy] = useState(false);

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
        properties: LEDGER_CONFIG.properties,
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
        return { deleted: res.deleted };
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
