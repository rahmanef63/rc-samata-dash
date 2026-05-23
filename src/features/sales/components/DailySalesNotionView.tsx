"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  businessDate: string; channelName: string;
  grossAmount: number; platformFee: number; promoCost: number; netAmount: number;
  cashReceivedAmount: number; settlementDate?: string; referenceNo: string; status: string;
};

const PROPS = [
  { id: "businessDate", name: "Tanggal",  type: "date" as const },
  { id: "channelName",  name: "Channel",  type: "text" as const },
  { id: "grossAmount",  name: "Bruto",    type: "number" as const, numberFormat: "currency" as const },
  { id: "platformFee",  name: "Komisi",   type: "number" as const, numberFormat: "currency" as const },
  { id: "promoCost",    name: "Diskon",   type: "number" as const, numberFormat: "currency" as const },
  { id: "netAmount",    name: "Netto",    type: "number" as const, numberFormat: "currency" as const },
  { id: "cashReceivedAmount", name: "Cash Diterima", type: "number" as const, numberFormat: "currency" as const },
  { id: "settlementDate", name: "Tgl Settle", type: "date" as const },
  { id: "referenceNo",  name: "Ref No.",  type: "text" as const },
  { id: "status",       name: "Status",   type: "select" as const, options: [
    { id: "recorded",          name: "Recorded",  color: "blue" as const },
    { id: "pending_settlement", name: "Pending",   color: "yellow" as const },
    { id: "settled",           name: "Settled",   color: "green" as const },
  ] },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Channel)", type: "board" as const, groupBy: "channelName",
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "businessDate",
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set([
  "businessDate", "grossAmount", "platformFee", "promoCost", "netAmount",
  "cashReceivedAmount", "settlementDate", "referenceNo", "status",
]);

function toPage(r: Row): Page {
  return {
    id: r._id, parentId: null,
    title: `${r.channelName} · ${r.businessDate}`,
    icon: r.status === "settled" ? "✅" : r.status === "pending_settlement" ? "⏳" : "📥",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_daily_sales",
    rowProps: {
      businessDate: r.businessDate, channelName: r.channelName,
      grossAmount: r.grossAmount, platformFee: r.platformFee,
      promoCost: r.promoCost, netAmount: r.netAmount,
      cashReceivedAmount: r.cashReceivedAmount,
      settlementDate: r.settlementDate ?? "",
      referenceNo: r.referenceNo, status: r.status,
    },
  };
}

export function DailySalesNotionView() {
  const rows = useQuery(api.features.sales.queries.listByBranch, {}) as Row[] | undefined;
  const patch = useMutation(api.features.sales.mutations.patch);
  const remove = useMutation(api.features.sales.mutations.remove);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_daily_sales", databaseName: "Penjualan Harian", databaseIcon: "💵",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage, exportFilenamePrefix: "sales",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"dailySales">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"dailySales">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"dailySales"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
