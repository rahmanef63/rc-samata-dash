"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  entityType: string; entityId: string;
  action: string; description: string;
  actedBy: string; actedAt: string;
};

const PROPS = [
  { id: "actedAt",     name: "Waktu",     type: "text" as const },
  { id: "entityType",  name: "Entity",    type: "text" as const },
  { id: "action",      name: "Aksi",      type: "select" as const, options: [
    { id: "create", name: "Create", color: "green" as const },
    { id: "update", name: "Update", color: "blue" as const },
    { id: "delete", name: "Delete", color: "red" as const },
    { id: "approve", name: "Approve", color: "purple" as const },
    { id: "reject", name: "Reject", color: "orange" as const },
    { id: "pay",    name: "Pay",    color: "yellow" as const },
  ] },
  { id: "description", name: "Deskripsi", type: "text" as const },
  { id: "actedBy",     name: "Pelaku",    type: "text" as const },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "actedAt", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Aksi)", type: "board" as const, groupBy: "action", sorts: [], filters: [], search: "" },
  { id: "v_feed",  name: "Feed",  type: "feed"  as const, sorts: [{ propertyId: "actedAt", direction: "desc" as const }], filters: [], search: "" },
];

export function AuditLogsNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.audit.queries.listByBranch, { branchId }) as Row[] | undefined;

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_audit_logs", databaseName: "Audit Log", databaseIcon: "📜",
        properties: PROPS, views: VIEWS,
        propToColumn: () => null, // read-only
        toPage: (r) => ({
          id: r._id, parentId: null,
          title: `${r.action} · ${r.entityType}`,
          icon: r.action === "delete" ? "🗑️" : r.action === "create" ? "🆕" : r.action === "update" ? "✏️" : "✅",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_audit_logs",
          rowProps: r as unknown as Record<string, PropertyValue>,
        }),
        exportFilenamePrefix: "audit-log",
      }}
      rows={rows}
      onRowUpdate={async () => { /* read-only */ }}
    />
  );
}
