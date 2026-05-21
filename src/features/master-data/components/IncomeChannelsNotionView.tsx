"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = { _id: string; _creationTime: number; name: string; type: string; isSettlementDelayed: boolean };

const PROPS = [
  { id: "name", name: "Nama", type: "text" as const },
  { id: "type", name: "Tipe", type: "select" as const, options: [
    { id: "cash", name: "Cash", color: "green" as const },
    { id: "transfer", name: "Transfer", color: "blue" as const },
    { id: "gofood", name: "Gofood", color: "orange" as const },
    { id: "grabfood", name: "Grabfood", color: "purple" as const },
    { id: "shopeefood", name: "Shopeefood", color: "red" as const },
    { id: "ovo", name: "OVO", color: "purple" as const },
    { id: "dana", name: "Dana", color: "blue" as const },
    { id: "qris", name: "QRIS", color: "gray" as const },
    { id: "dine_in", name: "Dine-in", color: "yellow" as const },
    { id: "take_away", name: "Take Away", color: "yellow" as const },
    { id: "other", name: "Other", color: "gray" as const },
  ] },
  { id: "isSettlementDelayed", name: "Settle Tunda?", type: "checkbox" as const },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const, sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Tipe)", type: "board" as const, groupBy: "type", sorts: [], filters: [], search: "" },
];
const EDITABLE = new Set(["name", "type", "isSettlementDelayed"]);

export function IncomeChannelsNotionView() {
  const rows = useQuery(api.features.masterData.queries.listIncomeChannels) as Row[] | undefined;
  const patch = useMutation(api.features.masterData.mutations.patchIncomeChannel);
  const remove = useMutation(api.features.masterData.mutations.deleteIncomeChannel);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_income_channels", databaseName: "Channel Pemasukan", databaseIcon: "💰",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage: (r) => ({
          id: r._id, parentId: null, title: r.name, icon: "💰",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_income_channels",
          rowProps: r as unknown as Record<string, PropertyValue>,
        }),
        exportFilenamePrefix: "income-channels",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"incomeChannels">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"incomeChannels">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"incomeChannels"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
