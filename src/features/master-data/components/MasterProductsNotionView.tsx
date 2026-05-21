"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  code: string; canonicalName: string; category: string;
  aliases: string[]; defaultSellingPrice?: number; isActive: boolean;
};

const PROPS = [
  { id: "code",          name: "Kode", type: "text" as const },
  { id: "canonicalName", name: "Nama Produk", type: "text" as const },
  { id: "category",      name: "Kategori", type: "select" as const, options: [
    { id: "ayam",    name: "Ayam",    color: "orange" as const },
    { id: "minuman", name: "Minuman", color: "blue" as const },
    { id: "snack",   name: "Snack",   color: "yellow" as const },
    { id: "paket",   name: "Paket",   color: "purple" as const },
    { id: "sambal",  name: "Sambal",  color: "red" as const },
    { id: "lainnya", name: "Lainnya", color: "gray" as const },
  ] },
  { id: "defaultSellingPrice", name: "Harga Jual", type: "number" as const, numberFormat: "currency" as const },
  { id: "aliasCount", name: "# Alias", type: "rollup" as const, rollupAggregate: "count" as const },
  { id: "isActive", name: "Aktif", type: "checkbox" as const },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "canonicalName", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Kategori)", type: "board" as const, groupBy: "category", sorts: [], filters: [], search: "" },
];
const EDITABLE = new Set(["canonicalName", "code", "category", "defaultSellingPrice", "isActive"]);

export function MasterProductsNotionView() {
  const rows = useQuery(api.features.masterData.queries.listMasterProducts, {}) as Row[] | undefined;
  const patch = useMutation(api.features.masterData.mutations.patchMasterProduct);
  const remove = useMutation(api.features.masterData.mutations.deleteMasterProduct);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_master_products", databaseName: "Master Produk", databaseIcon: "🍗",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage: (r) => ({
          id: r._id, parentId: null, title: r.canonicalName,
          icon: r.isActive ? "🍗" : "💤",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_master_products",
          rowProps: {
            code: r.code, canonicalName: r.canonicalName, category: r.category,
            defaultSellingPrice: r.defaultSellingPrice ?? 0,
            aliasCount: r.aliases?.length ?? 0,
            isActive: r.isActive,
          },
        }),
        exportFilenamePrefix: "master-products",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"masterProducts">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"masterProducts">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"masterProducts"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
