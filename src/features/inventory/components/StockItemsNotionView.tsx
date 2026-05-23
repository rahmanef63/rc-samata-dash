"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  name: string; currentQty: number; unit: string; minQty: number; status: string;
};

const PROPS = [
  { id: "name",       name: "Nama Barang", type: "text" as const },
  { id: "currentQty", name: "Stok Sekarang", type: "number" as const },
  { id: "unit",       name: "Satuan",     type: "text" as const },
  { id: "minQty",     name: "Stok Minimum", type: "number" as const },
  { id: "status",     name: "Status",     type: "select" as const, options: [
    { id: "Stable",   name: "Aman",     color: "green" as const },
    { id: "Low",      name: "Menipis",  color: "yellow" as const },
    { id: "Critical", name: "Kritis",   color: "red" as const },
  ] },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Status)", type: "board" as const, groupBy: "status",
    sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["name", "currentQty", "unit", "minQty", "status"]);

function toPage(r: Row): Page {
  return {
    id: r._id, parentId: null,
    title: `${r.name} · ${r.currentQty} ${r.unit}`,
    icon: r.status === "Critical" ? "🔴" : r.status === "Low" ? "🟡" : "🟢",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_stock_items",
    rowProps: r as unknown as Record<string, PropertyValue>,
  };
}

export function StockItemsNotionView() {
  const rows = useQuery(api.features.inventory.queries.listItems, {}) as Row[] | undefined;
  const patch = useMutation(api.features.inventory.mutations.patchItem);
  const remove = useMutation(api.features.inventory.mutations.deleteItem);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_stock_items", databaseName: "Inventaris", databaseIcon: "📦",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage, exportFilenamePrefix: "stock-items",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"stockItems">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"stockItems">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"stockItems"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
