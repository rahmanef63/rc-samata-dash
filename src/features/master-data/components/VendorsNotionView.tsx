"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type VendorRow = {
  _id: string;
  _creationTime: number;
  name: string;
  type: string;
  phone: string;
  notes: string;
  isActive: boolean;
};

const PROPS = [
  { id: "name",  name: "Nama",   type: "text" as const },
  { id: "type",  name: "Tipe",   type: "select" as const, options: [
    { id: "food_supplier", name: "Food",    color: "orange" as const },
    { id: "utility",       name: "Utility", color: "blue" as const },
    { id: "service",       name: "Service", color: "purple" as const },
    { id: "payroll",       name: "Payroll", color: "green" as const },
    { id: "misc",          name: "Misc",    color: "gray" as const },
  ] },
  { id: "phone", name: "Telp",   type: "text" as const },
  { id: "notes", name: "Catatan", type: "text" as const },
  { id: "isActive", name: "Aktif", type: "checkbox" as const },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (per Tipe)", type: "board" as const, groupBy: "type",
    sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
  { id: "v_list",  name: "List", type: "list" as const,
    sorts: [{ propertyId: "name", direction: "asc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["name", "type", "phone", "notes", "isActive"]);

function vendorToPage(v: VendorRow): Page {
  return {
    id: v._id, parentId: null,
    title: v.name,
    icon: v.isActive ? "🏪" : "💤",
    blocks: [], favorite: false, trashed: false,
    createdAt: v._creationTime, updatedAt: v._creationTime,
    rowOfDatabaseId: "db_vendors",
    rowProps: {
      name: v.name, type: v.type, phone: v.phone ?? "",
      notes: v.notes ?? "", isActive: v.isActive,
    },
  };
}

export function VendorsNotionView() {
  const rows = useQuery(api.features.masterData.queries.listVendors, {}) as VendorRow[] | undefined;
  const patch = useMutation(api.features.masterData.mutations.patchVendor);
  const remove = useMutation(api.features.masterData.mutations.deleteVendor);

  return (
    <EntityNotionView<VendorRow>
      config={{
        databaseId: "db_vendors",
        databaseName: "Vendor Master",
        databaseIcon: "🏪",
        properties: PROPS,
        views: VIEWS,
        propToColumn: (propId) => EDITABLE.has(propId) ? propId : null,
        toPage: vendorToPage,
        exportFilenamePrefix: "vendors",
      }}
      rows={rows}
      onRowUpdate={async (rowId: string, column: string, value: PropertyValue) => {
        await patch({ id: rowId as Id<"vendors">, [column]: value } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0;
        const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try {
            await patch({ id: p.id as Id<"vendors">, ...p.data } as Parameters<typeof patch>[0]);
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
          try { await remove({ id: id as Id<"vendors"> }); deleted++; } catch { /* skip */ }
        }
        return { deleted };
      }}
    />
  );
}
