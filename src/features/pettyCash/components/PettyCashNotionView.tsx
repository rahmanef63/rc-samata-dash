"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type PettyCashRow = {
  _id: string;
  _creationTime: number;
  requestDate: string;
  requestedBy: string;
  purposeCategory: string;
  requestedAmount: number;
  approvedAmount: number;
  actualAmount: number;
  status: string;
  notes: string;
  hasAttachment: boolean;
};

const PROPS = [
  { id: "requestDate",     name: "Tanggal",   type: "date" as const },
  { id: "requestedBy",     name: "Diminta Oleh", type: "text" as const },
  { id: "purposeCategory", name: "Kategori",  type: "select" as const, options: [
    { id: "Utilitas",       name: "Utilitas",       color: "blue" as const },
    { id: "Bahan Baku",     name: "Bahan Baku",     color: "orange" as const },
    { id: "Maintenance",    name: "Maintenance",    color: "purple" as const },
    { id: "Transfer Owner", name: "Transfer Owner", color: "green" as const },
    { id: "Lain-lain",      name: "Lain-lain",      color: "gray" as const },
  ] },
  { id: "requestedAmount", name: "Diminta",    type: "number" as const, numberFormat: "currency" as const },
  { id: "approvedAmount",  name: "Disetujui",  type: "number" as const, numberFormat: "currency" as const },
  { id: "actualAmount",    name: "Realisasi",  type: "number" as const, numberFormat: "currency" as const },
  { id: "status",          name: "Status",     type: "select" as const, options: [
    { id: "requested", name: "Requested", color: "gray" as const },
    { id: "approved",  name: "Approved",  color: "blue" as const },
    { id: "rejected",  name: "Ditolak",   color: "red" as const },
    { id: "disbursed", name: "Cair",      color: "yellow" as const },
    { id: "closed",    name: "Closed",    color: "green" as const },
  ] },
  { id: "notes",           name: "Catatan",    type: "text" as const },
  { id: "hasAttachment",   name: "Ada Bukti",  type: "checkbox" as const },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "requestDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (per Status)", type: "board" as const, groupBy: "status",
    sorts: [{ propertyId: "requestDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "requestDate",
    sorts: [{ propertyId: "requestDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_list", name: "List", type: "list" as const,
    sorts: [{ propertyId: "requestDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set([
  "requestDate", "purposeCategory", "requestedAmount", "approvedAmount",
  "actualAmount", "status", "notes", "hasAttachment",
]);

function pettyCashToPage(r: PettyCashRow): Page {
  return {
    id: r._id, parentId: null,
    title: `${r.purposeCategory} · Rp ${r.requestedAmount.toLocaleString("id-ID")}`,
    icon: r.status === "closed" ? "✅" : r.status === "rejected" ? "❌" : r.status === "disbursed" ? "💸" : r.status === "approved" ? "🟢" : "📝",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_petty_cash",
    rowProps: {
      requestDate: r.requestDate, requestedBy: r.requestedBy,
      purposeCategory: r.purposeCategory,
      requestedAmount: r.requestedAmount, approvedAmount: r.approvedAmount,
      actualAmount: r.actualAmount, status: r.status,
      notes: r.notes, hasAttachment: r.hasAttachment,
    },
  };
}

export function PettyCashNotionView() {
  const rows = useQuery(api.features.pettyCash.queries.listByBranch, {}) as PettyCashRow[] | undefined;
  const patch = useMutation(api.features.pettyCash.mutations.update);
  const remove = useMutation(api.features.pettyCash.mutations.remove);

  return (
    <EntityNotionView<PettyCashRow>
      config={{
        databaseId: "db_petty_cash",
        databaseName: "Petty Cash",
        databaseIcon: "💰",
        properties: PROPS,
        views: VIEWS,
        propToColumn: (propId) => EDITABLE.has(propId) ? propId : null,
        toPage: pettyCashToPage,
        exportFilenamePrefix: "petty-cash",
      }}
      rows={rows}
      onRowUpdate={async (rowId: string, column: string, value: PropertyValue) => {
        await patch({ id: rowId as Id<"pettyCashRequests">, [column]: value } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0;
        const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try {
            await patch({ id: p.id as Id<"pettyCashRequests">, ...p.data } as Parameters<typeof patch>[0]);
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
          try { await remove({ id: id as Id<"pettyCashRequests"> }); deleted++; } catch { /* skip */ }
        }
        return { deleted };
      }}
    />
  );
}
