"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
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

const PROPS = [
  { id: "expenseDate",   name: "Tanggal",   type: "date" as const },
  { id: "categoryName",  name: "Kategori",  type: "text" as const },
  { id: "vendorName",    name: "Vendor",    type: "text" as const },
  { id: "amount",        name: "Nominal",   type: "number" as const, numberFormat: "currency" as const },
  { id: "description",   name: "Deskripsi", type: "text" as const },
  { id: "paymentSource", name: "Sumber Bayar", type: "select" as const, options: [
    { id: "owner_direct", name: "Owner",    color: "purple" as const },
    { id: "petty_cash",   name: "Kas Kecil", color: "blue" as const },
    { id: "payable",      name: "Piutang",  color: "orange" as const },
  ] },
  { id: "status",        name: "Status",    type: "select" as const, options: [
    { id: "draft",     name: "Draft",    color: "gray" as const },
    { id: "submitted", name: "Submitted", color: "yellow" as const },
    { id: "approved",  name: "Approved", color: "blue" as const },
    { id: "paid",      name: "Lunas",    color: "green" as const },
    { id: "rejected",  name: "Ditolak",  color: "red" as const },
  ] },
  { id: "hasAttachment", name: "Ada Lampiran", type: "checkbox" as const },
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

const EDITABLE = new Set(["expenseDate", "amount", "description", "paymentSource", "status", "hasAttachment"]);

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

export function ExpensesNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.expenses.queries.listByBranch, { branchId }) as ExpenseRow[] | undefined;
  const patch = useMutation(api.features.expenses.mutations.patch);
  const remove = useMutation(api.features.expenses.mutations.remove);

  return (
    <EntityNotionView<ExpenseRow>
      config={{
        databaseId: "db_expenses",
        databaseName: "Pengeluaran",
        databaseIcon: "💳",
        properties: PROPS,
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
