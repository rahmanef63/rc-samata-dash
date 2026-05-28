"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";
import { useCanManageFinance } from "@/features/auth/useUserRole";

type Row = {
  _id: string; _creationTime: number;
  businessDate: string; openingCash: number; cashSales: number; nonCashSales: number;
  expensesPaidCash: number; expectedCash: number; actualCash: number; difference: number;
  status: string;
};

const PROPS = [
  { id: "businessDate",     name: "Tanggal",   type: "date" as const },
  { id: "openingCash",      name: "Kas Awal",  type: "number" as const, numberFormat: "currency" as const },
  { id: "cashSales",        name: "Cash",      type: "number" as const, numberFormat: "currency" as const },
  { id: "nonCashSales",     name: "Non-Cash",  type: "number" as const, numberFormat: "currency" as const },
  { id: "expensesPaidCash", name: "Pengeluaran Cash", type: "number" as const, numberFormat: "currency" as const },
  { id: "expectedCash",     name: "Diharapkan", type: "number" as const, numberFormat: "currency" as const },
  { id: "actualCash",       name: "Aktual",    type: "number" as const, numberFormat: "currency" as const },
  { id: "difference",       name: "Selisih",   type: "number" as const, numberFormat: "currency" as const },
  { id: "status",           name: "Status",    type: "select" as const, options: [
    { id: "open",      name: "Open",      color: "gray" as const },
    { id: "submitted", name: "Submitted", color: "yellow" as const },
    { id: "verified",  name: "Verified",  color: "green" as const },
  ] },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "businessDate",
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["actualCash", "status"]);

function toPage(r: Row): Page {
  return {
    id: r._id, parentId: null,
    title: `${r.businessDate} · Rp ${(r.cashSales + r.nonCashSales).toLocaleString("id-ID")}`,
    icon: r.difference === 0 ? "✅" : Math.abs(r.difference) < 10000 ? "🟡" : "⚠️",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_daily_closings",
    rowProps: r as unknown as Record<string, PropertyValue>,
  };
}

export function DailyClosingsNotionView() {
  const rows = useQuery(api.features.closing.queries.listClosings, {}) as Row[] | undefined;
  const patch = useMutation(api.features.closing.mutations.updateClosing);
  const removeClosing = useMutation(api.features.closing.mutations.removeClosing);
  const canManage = useCanManageFinance();

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_daily_closings", databaseName: "Setoran Harian", databaseIcon: "🧾",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage, exportFilenamePrefix: "setoran",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"dailyClosings">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"dailyClosings">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={canManage ? async (ids) => {
        let deleted = 0;
        for (const id of ids) {
          try { await removeClosing({ id: id as Id<"dailyClosings"> }); deleted++; }
          catch { /* skip, surface lewat toast caller */ }
        }
        return { deleted };
      } : undefined}
    />
  );
}
