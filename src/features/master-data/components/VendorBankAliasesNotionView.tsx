"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number; alias: string;
  accountNo?: string; vendorId: string; source: string;
  seenCount: number; lastSeenAt: number;
};

const PROPS = [
  { id: "alias",      name: "Alias Bank", type: "text" as const },
  { id: "accountNo",  name: "No. Rekening", type: "text" as const },
  { id: "vendorName", name: "Vendor", type: "relation" as const,
    relationTableName: "vendors", relationDisplayField: "name" },
  { id: "source",     name: "Sumber", type: "select" as const, options: [
    { id: "manual",     name: "Manual",     color: "blue" as const },
    { id: "statement",  name: "Statement",  color: "green" as const },
    { id: "validation", name: "Validation", color: "purple" as const },
  ] },
  { id: "seenCount",  name: "Frequency", type: "rollup" as const, rollupAggregate: "count" as const,
    numberFormat: "number" as const },
  { id: "lastSeenAt", name: "Terakhir Dilihat", type: "last_edited_time" as const },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "lastSeenAt", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Sumber)", type: "board" as const, groupBy: "source", sorts: [], filters: [], search: "" },
];
const EDITABLE = new Set(["alias", "accountNo"]);

export function VendorBankAliasesNotionView() {
  const rows = useQuery(api.features.closing.queries.listVendorBankAliases, {}) as Row[] | undefined;
  const vendors = useQuery(api.features.masterData.queries.listVendors, {}) as Array<{ _id: string; name: string }> | undefined;
  const patch = useMutation(api.features.closing.mutations.patchVendorAlias);
  const remove = useMutation(api.features.closing.mutations.deleteVendorAlias);

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vendors ?? []) m.set(v._id, v.name);
    return m;
  }, [vendors]);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_vendor_aliases", databaseName: "Alias Bank Vendor", databaseIcon: "🔖",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage: (r) => ({
          id: r._id, parentId: null,
          title: `${r.alias} → ${vendorNameById.get(r.vendorId) ?? "?"}`,
          icon: r.source === "manual" ? "✋" : r.source === "validation" ? "🤖" : "📥",
          blocks: [], favorite: false, trashed: false,
          createdAt: r._creationTime, updatedAt: r._creationTime,
          rowOfDatabaseId: "db_vendor_aliases",
          rowProps: {
            alias: r.alias, accountNo: r.accountNo ?? "",
            vendorName: vendorNameById.get(r.vendorId) ?? r.vendorId,
            source: r.source, seenCount: r.seenCount,
            lastSeenAt: new Date(r.lastSeenAt).toISOString().slice(0, 10),
          },
        }),
        exportFilenamePrefix: "vendor-aliases",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"vendorBankAliases">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"vendorBankAliases">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"vendorBankAliases"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
