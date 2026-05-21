"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  transferDate: string; direction: string; purpose: string;
  amount: number; referenceNo: string; status: string;
};

const PROPS = [
  { id: "transferDate", name: "Tanggal",  type: "date" as const },
  { id: "direction",    name: "Arah",     type: "select" as const, options: [
    { id: "branch_to_owner", name: "Setor ke Owner",  color: "red" as const },
    { id: "owner_to_branch", name: "Topup dari Owner", color: "green" as const },
  ] },
  { id: "purpose",      name: "Tujuan",   type: "select" as const, options: [
    { id: "night_transfer",       name: "Setoran Malam",    color: "blue" as const },
    { id: "petty_cash_topup",     name: "Topup Kas Kecil",  color: "purple" as const },
    { id: "payable_payment_fund", name: "Dana Bayar Vendor", color: "orange" as const },
    { id: "adjustment",           name: "Penyesuaian",      color: "gray" as const },
  ] },
  { id: "amount",       name: "Nominal",  type: "number" as const, numberFormat: "currency" as const },
  { id: "referenceNo",  name: "No. Ref",  type: "text" as const },
  { id: "status",       name: "Status",   type: "select" as const, options: [
    { id: "pending",   name: "Pending",   color: "yellow" as const },
    { id: "completed", name: "Completed", color: "green" as const },
  ] },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "transferDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Arah)", type: "board" as const, groupBy: "direction",
    sorts: [{ propertyId: "transferDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "transferDate",
    sorts: [{ propertyId: "transferDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["transferDate", "direction", "purpose", "amount", "referenceNo", "status"]);

function toPage(r: Row): Page {
  return {
    id: r._id, parentId: null,
    title: `${r.direction === "branch_to_owner" ? "→ OWNER" : "← OWNER"} · Rp ${r.amount.toLocaleString("id-ID")}`,
    icon: r.direction === "branch_to_owner" ? "⬆️" : "⬇️",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_owner_transfers",
    rowProps: { transferDate: r.transferDate, direction: r.direction, purpose: r.purpose,
      amount: r.amount, referenceNo: r.referenceNo, status: r.status },
  };
}

export function OwnerTransfersNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.closing.queries.listTransfers, { branchId }) as Row[] | undefined;
  const patch = useMutation(api.features.closing.mutations.updateTransfer);
  const remove = useMutation(api.features.closing.mutations.removeTransfer);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_owner_transfers", databaseName: "Transfer Owner ↔ PIC", databaseIcon: "↔️",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage, exportFilenamePrefix: "owner-transfers",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"ownerTransfers">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"ownerTransfers">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"ownerTransfers"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
