"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  itemName: string; type: string;
  qty: number; unit: string; date: string; notes: string;
};

const PROPS = [
  { id: "date",     name: "Tanggal", type: "date" as const },
  { id: "itemName", name: "Barang", type: "text" as const },
  { id: "type",     name: "Jenis",  type: "select" as const, options: [
    { id: "stock_in",   name: "Masuk",      color: "green" as const },
    { id: "usage",      name: "Penggunaan", color: "blue" as const },
    { id: "adjustment", name: "Penyesuaian", color: "yellow" as const },
    { id: "waste",      name: "Rusak",      color: "red" as const },
  ] },
  { id: "qty",      name: "Qty",    type: "number" as const },
  { id: "unit",     name: "Satuan", type: "text" as const },
  { id: "notes",    name: "Catatan", type: "text" as const },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "date", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Jenis)", type: "board" as const, groupBy: "type",
    sorts: [{ propertyId: "date", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "date",
    sorts: [{ propertyId: "date", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["date", "type", "qty", "unit", "notes"]);

function toPage(r: Row): Page {
  return {
    id: r._id, parentId: null,
    title: `${r.itemName} · ${r.type === "stock_in" ? "+" : "-"}${r.qty} ${r.unit}`,
    icon: r.type === "stock_in" ? "📥" : r.type === "usage" ? "📤" : r.type === "waste" ? "🗑️" : "🔄",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_stock_movements",
    rowProps: r as unknown as Record<string, PropertyValue>,
  };
}

export function StockMovementsNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.inventory.queries.listAllMovements, { branchId }) as Row[] | undefined;
  const patch = useMutation(api.features.inventory.mutations.patchMovement);
  const remove = useMutation(api.features.inventory.mutations.removeMovement);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_stock_movements", databaseName: "Mutasi Stok", databaseIcon: "🔁",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage, exportFilenamePrefix: "stock-movements",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"stockMovements">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"stockMovements">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"stockMovements"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
