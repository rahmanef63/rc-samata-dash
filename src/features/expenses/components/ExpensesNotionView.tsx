"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue, Property, SelectOption } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type ExpenseRow = {
  _id: string;
  _creationTime: number;
  expenseDate: string;
  categoryName: string;
  vendorName?: string;
  amount: number;
  description: string;
  paymentSource: string;
  status: string;
  hasAttachment: boolean;
};

const STATIC_PROPS: Property[] = [
  { id: "expenseDate",   name: "Tanggal",   type: "date" },
  { id: "vendorName",    name: "Vendor",    type: "text" },
  { id: "amount",        name: "Nominal",   type: "number", numberFormat: "currency" },
  { id: "description",   name: "Deskripsi", type: "text" },
  { id: "paymentSource", name: "Sumber Bayar", type: "select", options: [
    { id: "owner_direct", name: "Owner",    color: "purple" },
    { id: "petty_cash",   name: "Kas Kecil", color: "blue" },
    { id: "payable",      name: "Piutang",  color: "orange" },
  ] },
  { id: "status",        name: "Status",    type: "select", options: [
    { id: "draft",     name: "Draft",    color: "gray" },
    { id: "submitted", name: "Submitted", color: "yellow" },
    { id: "approved",  name: "Approved", color: "blue" },
    { id: "paid",      name: "Lunas",    color: "green" },
    { id: "rejected",  name: "Ditolak",  color: "red" },
  ] },
  { id: "hasAttachment", name: "Ada Lampiran", type: "checkbox" },
];

const VIEWS = [
  { id: "v_table",    name: "Tabel",   type: "table" as const,
    sorts: [{ propertyId: "expenseDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board",    name: "Board (per Status)", type: "board" as const, groupBy: "status",
    sorts: [{ propertyId: "expenseDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "expenseDate",
    sorts: [{ propertyId: "expenseDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_list",     name: "List",    type: "list" as const,
    sorts: [{ propertyId: "expenseDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["expenseDate", "amount", "description", "paymentSource", "status", "hasAttachment", "categoryName"]);

function expenseToPage(e: ExpenseRow): Page {
  return {
    id: e._id, parentId: null,
    title: `${e.categoryName} · Rp ${e.amount.toLocaleString("id-ID")}`,
    icon: e.status === "paid" ? "✅" : e.status === "rejected" ? "❌" : e.status === "approved" ? "🟢" : e.status === "submitted" ? "🟡" : "📝",
    blocks: [], favorite: false, trashed: false,
    createdAt: e._creationTime, updatedAt: e._creationTime,
    rowOfDatabaseId: "db_expenses",
    rowProps: {
      expenseDate: e.expenseDate, categoryName: e.categoryName,
      vendorName: e.vendorName ?? "", amount: e.amount,
      description: e.description, paymentSource: e.paymentSource,
      status: e.status, hasAttachment: e.hasAttachment,
    },
  };
}

export function ExpensesNotionView() {
  const rows = useQuery(api.features.expenses.queries.listByBranch, {}) as ExpenseRow[] | undefined;
  const expenseCategories = useQuery(api.features.masterData.queries.listExpenseCategories);
  const patch = useMutation(api.features.expenses.mutations.patch);
  const remove = useMutation(api.features.expenses.mutations.remove);
  const createCategory = useMutation(api.features.masterData.mutations.createExpenseCategory);

  // Dynamic select-with-create for kategori. Options live in expenseCategories
  // DB table — owner can pick existing OR type a new label and click
  // "Create [value]" to add a new category inline (mutates DB, refetches).
  const properties = useMemo<Property[]>(() => {
    const categoryOptions: SelectOption[] = (expenseCategories ?? []).map((c) => ({
      id: c.name, name: c.name, color: "gray",
    }));
    const categoryProp: Property = {
      id: "categoryName",
      name: "Kategori",
      type: "select",
      options: categoryOptions,
      allowCreate: true,
      onCreateOption: async (label: string) => {
        await createCategory({ name: label, type: "other" });
        return { id: label, name: label, color: "gray" };
      },
    };
    return [STATIC_PROPS[0], categoryProp, ...STATIC_PROPS.slice(1)];
  }, [expenseCategories, createCategory]);

  return (
    <EntityNotionView<ExpenseRow>
      config={{
        databaseId: "db_expenses",
        databaseName: "Pengeluaran",
        databaseIcon: "💳",
        properties,
        views: VIEWS,
        propToColumn: (propId) => EDITABLE.has(propId) ? propId : null,
        toPage: expenseToPage,
        exportFilenamePrefix: "expenses",
      }}
      rows={rows}
      onRowUpdate={async (rowId: string, column: string, value: PropertyValue) => {
        await patch({ id: rowId as Id<"expenses">, [column]: value } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0;
        const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try {
            await patch({ id: p.id as Id<"expenses">, ...p.data } as Parameters<typeof patch>[0]);
            updated++;
          } catch (e) {
            errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" });
          }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) {
          try { await remove({ id: id as Id<"expenses"> }); deleted++; } catch { /* skip */ }
        }
        return { deleted };
      }}
    />
  );
}
