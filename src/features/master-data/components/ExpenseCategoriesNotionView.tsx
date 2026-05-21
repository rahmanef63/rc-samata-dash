"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = { _id: string; _creationTime: number; name: string; type: string };

const PROPS = [
  { id: "name", name: "Nama", type: "text" as const },
  { id: "type", name: "Tipe", type: "select" as const, options: [
    { id: "cogs", name: "COGS", color: "orange" as const },
    { id: "utility", name: "Utility", color: "blue" as const },
    { id: "salary_support", name: "Salary Support", color: "purple" as const },
    { id: "bpjs", name: "BPJS", color: "green" as const },
    { id: "maintenance", name: "Maintenance", color: "yellow" as const },
    { id: "marketing", name: "Marketing", color: "red" as const },
    { id: "fee", name: "Fee", color: "gray" as const },
    { id: "other", name: "Other", color: "gray" as const },
  ] },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const, sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Tipe)", type: "board" as const, groupBy: "type", sorts: [], filters: [], search: "" },
];
const EDITABLE = new Set(["name", "type"]);

export function ExpenseCategoriesNotionView() {
  const rows = useQuery(api.features.masterData.queries.listExpenseCategories) as Row[] | undefined;
  const patch = useMutation(api.features.masterData.mutations.patchExpenseCategory);
  const remove = useMutation(api.features.masterData.mutations.deleteExpenseCategory);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_expense_categories", databaseName: "Kategori Pengeluaran", databaseIcon: "🏷️",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage: (r) => ({
          id: r._id, parentId: null, title: r.name, icon: "🏷️",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_expense_categories",
          rowProps: r as unknown as Record<string, PropertyValue>,
        }),
        exportFilenamePrefix: "expense-categories",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"expenseCategories">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"expenseCategories">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"expenseCategories"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
