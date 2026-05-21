"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  fileName: string; rowsApplied: number; rowsRejected: number;
  summary?: string; uploadedAt: number; uploadedBy: string;
};

const PROPS = [
  { id: "fileName",    name: "File",       type: "text" as const },
  { id: "rowsApplied", name: "Applied",    type: "number" as const, numberFormat: "number" as const },
  { id: "rowsRejected", name: "Rejected",  type: "number" as const, numberFormat: "number" as const },
  { id: "summary",     name: "Ringkasan",  type: "text" as const },
  { id: "uploadedBy",  name: "Uploader",   type: "text" as const },
];
const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "uploadedAt", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_feed", name: "Feed", type: "feed" as const, sorts: [], filters: [], search: "" },
];

export function ValidationBatchesNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.closing.queries.listValidationBatches, { branchId }) as Row[] | undefined;

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_validation_batches", databaseName: "Riwayat Validasi", databaseIcon: "🧪",
        properties: PROPS, views: VIEWS,
        propToColumn: () => null,
        toPage: (r) => ({
          id: r._id, parentId: null,
          title: r.fileName,
          icon: r.rowsRejected > 0 ? "⚠️" : "🧪",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_validation_batches",
          rowProps: r as unknown as Record<string, PropertyValue>,
        }),
        exportFilenamePrefix: "validation-batches",
      }}
      rows={rows}
      onRowUpdate={async () => { /* read-only */ }}
    />
  );
}
