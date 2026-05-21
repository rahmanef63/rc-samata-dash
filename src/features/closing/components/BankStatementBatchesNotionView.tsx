"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  accountKind: string; periodStart: string; periodEnd: string;
  fileName: string; openingBalance?: number; closingBalance?: number;
  rowCount: number; status: string; uploadedAt: number;
};

const PROPS = [
  { id: "fileName",       name: "File",       type: "text" as const },
  { id: "accountKind",    name: "Akun",       type: "select" as const, options: [
    { id: "owner", name: "Owner", color: "purple" as const },
    { id: "pic",   name: "PIC",   color: "blue" as const },
  ] },
  { id: "periodStart",    name: "Mulai",      type: "date" as const },
  { id: "periodEnd",      name: "Selesai",    type: "date" as const },
  { id: "openingBalance", name: "Saldo Awal", type: "number" as const, numberFormat: "currency" as const },
  { id: "closingBalance", name: "Saldo Akhir", type: "number" as const, numberFormat: "currency" as const },
  { id: "rowCount",       name: "# Entri",    type: "rollup" as const, rollupAggregate: "count" as const },
  { id: "status",         name: "Status",     type: "select" as const, options: [
    { id: "uploaded",   name: "Uploaded",   color: "yellow" as const },
    { id: "parsed",     name: "Parsed",     color: "blue" as const },
    { id: "reconciled", name: "Reconciled", color: "green" as const },
  ] },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "periodStart", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Status)", type: "board" as const, groupBy: "status", sorts: [], filters: [], search: "" },
];

export function BankStatementBatchesNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.closing.queries.listBankStatementBatches, { branchId }) as Row[] | undefined;

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_bank_batches", databaseName: "Bank Statement Batches", databaseIcon: "📂",
        properties: PROPS, views: VIEWS,
        propToColumn: () => null,
        toPage: (r) => ({
          id: r._id, parentId: null,
          title: `${r.accountKind === "owner" ? "🟣" : "🔵"} ${r.fileName}`,
          icon: r.status === "reconciled" ? "✅" : r.status === "parsed" ? "🔵" : "📤",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_bank_batches",
          rowProps: r as unknown as Record<string, PropertyValue>,
        }),
        exportFilenamePrefix: "bank-batches",
      }}
      rows={rows}
      onRowUpdate={async () => { /* read-only */ }}
    />
  );
}
