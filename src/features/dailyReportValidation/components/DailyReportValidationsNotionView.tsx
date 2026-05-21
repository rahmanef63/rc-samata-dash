"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  businessDate: string; kind: string;
  matchedAll: boolean; note?: string;
  validatedBy: string; validatedAt: number;
};

const PROPS = [
  { id: "businessDate", name: "Tanggal", type: "date" as const },
  { id: "kind",         name: "Jenis",   type: "select" as const, options: [
    { id: "transferOnline", name: "Transfer Online", color: "blue" as const },
    { id: "dailySummary",   name: "Rangkuman Harian", color: "green" as const },
    { id: "monthlyTally",   name: "Tally Bulanan",    color: "purple" as const },
  ] },
  { id: "matchedAll",   name: "Cocok Semua?", type: "checkbox" as const },
  { id: "note",         name: "Catatan",      type: "text" as const },
  { id: "validatedBy",  name: "Validator",    type: "text" as const },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Jenis)", type: "board" as const, groupBy: "kind", sorts: [], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "businessDate",
    sorts: [{ propertyId: "businessDate", direction: "desc" as const }], filters: [], search: "" },
];

export function DailyReportValidationsNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.dailyReportValidation.queries.listDailyReportValidations, { branchId }) as Row[] | undefined;

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_report_validations", databaseName: "Validasi Laporan Harian", databaseIcon: "✅",
        properties: PROPS, views: VIEWS,
        propToColumn: () => null,
        toPage: (r) => ({
          id: r._id, parentId: null,
          title: `${r.businessDate} · ${r.kind}`,
          icon: r.matchedAll ? "✅" : "⚠️",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_report_validations",
          rowProps: r as unknown as Record<string, PropertyValue>,
        }),
        exportFilenamePrefix: "validations",
      }}
      rows={rows}
      onRowUpdate={async () => { /* read-only */ }}
    />
  );
}
