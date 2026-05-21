"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  code: string; canonicalName: string; category: string;
  unit: string; aliases: string[]; isActive: boolean;
};

const PROPS = [
  { id: "code",          name: "Kode", type: "text" as const },
  { id: "canonicalName", name: "Nama Bahan", type: "text" as const },
  { id: "category",      name: "Kategori", type: "select" as const, options: [
    { id: "protein",        name: "Protein",        color: "red" as const },
    { id: "sayur",          name: "Sayur",          color: "green" as const },
    { id: "bumbu",          name: "Bumbu",          color: "orange" as const },
    { id: "minyak",         name: "Minyak",         color: "yellow" as const },
    { id: "kemasan",        name: "Kemasan",        color: "blue" as const },
    { id: "minuman_bahan",  name: "Bahan Minuman",  color: "purple" as const },
    { id: "lainnya",        name: "Lainnya",        color: "gray" as const },
  ] },
  { id: "unit",     name: "Satuan",   type: "text" as const },
  { id: "aliasCount", name: "# Alias", type: "rollup" as const, rollupAggregate: "count" as const },
  { id: "isActive", name: "Aktif",    type: "checkbox" as const },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "canonicalName", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Kategori)", type: "board" as const, groupBy: "category", sorts: [], filters: [], search: "" },
];
const EDITABLE = new Set(["canonicalName", "code", "category", "unit", "isActive"]);

export function MasterIngredientsNotionView() {
  const rows = useQuery(api.features.masterData.queries.listMasterIngredients, {}) as Row[] | undefined;
  const patch = useMutation(api.features.masterData.mutations.patchMasterIngredient);
  const remove = useMutation(api.features.masterData.mutations.deleteMasterIngredient);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_master_ingredients", databaseName: "Master Bahan Baku", databaseIcon: "🥕",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage: (r) => ({
          id: r._id, parentId: null, title: r.canonicalName,
          icon: r.isActive ? "🥕" : "💤",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_master_ingredients",
          rowProps: {
            code: r.code, canonicalName: r.canonicalName, category: r.category,
            unit: r.unit, aliasCount: r.aliases?.length ?? 0, isActive: r.isActive,
          },
        }),
        exportFilenamePrefix: "master-ingredients",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"masterIngredients">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"masterIngredients">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"masterIngredients"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
