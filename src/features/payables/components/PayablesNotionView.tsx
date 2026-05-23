"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type PayableRow = {
  _id: string;
  _creationTime: number;
  vendorId: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  description: string;
  refPdfFile?: string;
};

const PROPS = [
  { id: "invoiceDate", name: "Tanggal Faktur", type: "date" as const },
  { id: "dueDate",     name: "Jatuh Tempo",   type: "date" as const },
  { id: "vendorName",  name: "Vendor",        type: "text" as const },
  { id: "amount",      name: "Nominal",       type: "number" as const, numberFormat: "currency" as const },
  { id: "paidAmount",  name: "Sudah Bayar",   type: "number" as const, numberFormat: "currency" as const },
  { id: "status",      name: "Status",        type: "select" as const, options: [
    { id: "open",     name: "Open",    color: "gray" as const },
    { id: "partial",  name: "Partial", color: "yellow" as const },
    { id: "paid",     name: "Lunas",   color: "green" as const },
    { id: "overdue",  name: "Telat",   color: "red" as const },
  ] },
  { id: "description", name: "Deskripsi",     type: "text" as const },
  { id: "refPdfFile",  name: "File Sumber",   type: "text" as const },
];

const VIEWS = [
  { id: "v_table",    name: "Tabel",    type: "table" as const,
    sorts: [{ propertyId: "invoiceDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board",    name: "Board (per Status)", type: "board" as const, groupBy: "status",
    sorts: [{ propertyId: "invoiceDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "dueDate",
    sorts: [{ propertyId: "dueDate", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_list",     name: "List",     type: "list" as const,
    sorts: [{ propertyId: "invoiceDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["invoiceDate", "dueDate", "amount", "paidAmount", "status", "description"]);

function payableToPage(p: PayableRow): Page {
  return {
    id: p._id,
    parentId: null,
    title: `${p.vendorName} · Rp ${p.amount.toLocaleString("id-ID")}`,
    icon: p.status === "paid" ? "✅" : p.status === "overdue" ? "⚠️" : p.status === "partial" ? "🟡" : "📄",
    blocks: [],
    favorite: false,
    trashed: false,
    createdAt: p._creationTime,
    updatedAt: p._creationTime,
    rowOfDatabaseId: "db_payables",
    rowProps: {
      invoiceDate: p.invoiceDate,
      dueDate: p.dueDate,
      vendorName: p.vendorName,
      amount: p.amount,
      paidAmount: p.paidAmount,
      status: p.status,
      description: p.description ?? "",
      refPdfFile: p.refPdfFile ?? "",
    },
  };
}

export function PayablesNotionView() {
  const rows = useQuery(api.features.payables.queries.listByBranch, {}) as PayableRow[] | undefined;
  const update = useMutation(api.features.payables.mutations.update);
  const remove = useMutation(api.features.payables.mutations.remove);

  return (
    <EntityNotionView<PayableRow>
      config={{
        databaseId: "db_payables",
        databaseName: "Piutang Vendor",
        databaseIcon: "💸",
        properties: PROPS,
        views: VIEWS,
        propToColumn: (propId) => EDITABLE.has(propId) ? propId : null,
        toPage: payableToPage,
        exportFilenamePrefix: "payables",
      }}
      rows={rows}
      onRowUpdate={async (rowId: string, column: string, value: PropertyValue) => {
        await update({
          id: rowId as Id<"payables">,
          [column]: value,
        } as Parameters<typeof update>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0;
        const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try {
            await update({ id: p.id as Id<"payables">, ...p.data } as Parameters<typeof update>[0]);
            updated++;
          } catch (e) {
            errors.push({ id: p.id, message: e instanceof Error ? e.message : "update failed" });
          }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) {
          try { await remove({ id: id as Id<"payables"> }); deleted++; } catch { /* skip */ }
        }
        return { deleted };
      }}
    />
  );
}
