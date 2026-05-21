"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TabBar, DataTable, CrudDialog, SectionHeader } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState } from "@/shared/hooks";
import { VendorsNotionView } from "./VendorsNotionView";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Vendor, IncomeChannel, ExpenseCategory } from "@/shared/types";
import { vendorTypeLabels, channelTypeLabels, expenseCategoryTypeLabels } from "../lib";
import {
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor,
  useIncomeChannels, useCreateIncomeChannel, useUpdateIncomeChannel, useDeleteIncomeChannel,
  useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory
} from "../api";

// ── Vendor Tab ──────────────────────────────────────────
const vendorFields: FieldConfig[] = [
  { key: "name", label: "Nama Vendor", required: true },
  { key: "type", label: "Tipe", type: "select", options: Object.entries(vendorTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
  { key: "phone", label: "Telepon", placeholder: "08xx-xxxx-xxxx" },
  { key: "notes", label: "Catatan" },
];

const vendorColumns: Column<Vendor>[] = [
  { key: "name", label: "Nama Vendor" },
  { key: "type", label: "Tipe", render: (v) => <span className="text-muted-foreground">{vendorTypeLabels[v] || v}</span> },
  { key: "phone", label: "Telepon", className: "font-mono-data text-xs" },
  { key: "notes", label: "Catatan", render: (v) => <span className="text-muted-foreground text-xs">{v}</span> },
  { key: "isActive", label: "Status", render: (v) => <StatusBadge status={v ? "completed" : "rejected"}>{v ? "Aktif" : "Nonaktif"}</StatusBadge> },
];

// ── Channel Tab ─────────────────────────────────────────
const channelFields: FieldConfig[] = [
  { key: "name", label: "Nama Channel", required: true },
  { key: "type", label: "Tipe", type: "select", options: Object.entries(channelTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
];

const channelColumns: Column<IncomeChannel>[] = [
  { key: "name", label: "Nama Channel" },
  { key: "type", label: "Tipe", render: (v) => <span className="text-muted-foreground">{channelTypeLabels[v] || v}</span> },
  { key: "isSettlementDelayed", label: "Settlement Tertunda", render: (v) => <StatusBadge status={v ? "pending" : "completed"}>{v ? "Ya" : "Tidak"}</StatusBadge> },
];

// ── Category Tab ────────────────────────────────────────
const categoryFields: FieldConfig[] = [
  { key: "name", label: "Nama Kategori", required: true },
  { key: "type", label: "Tipe", type: "select", options: Object.entries(expenseCategoryTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
];

const categoryColumns: Column<ExpenseCategory>[] = [
  { key: "name", label: "Nama Kategori" },
  { key: "type", label: "Tipe", render: (v) => <span className="text-muted-foreground">{expenseCategoryTypeLabels[v] || v}</span> },
];

const tabs = ["Vendor", "Channel Pendapatan", "Kategori Pengeluaran"] as const;
type Tab = typeof tabs[number];

export function MasterDataPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("Vendor");

  const vendorsData = (useVendors() || []).map(v => ({ ...v, id: v._id })) as unknown as Vendor[];
  const channelsData = (useIncomeChannels() || []).map(v => ({ ...v, id: v._id, isSettlementDelayed: Boolean(v.isSettlementDelayed) })) as unknown as IncomeChannel[];
  const categoriesData = (useExpenseCategories() || []).map(v => ({ ...v, id: v._id })) as unknown as ExpenseCategory[];

  const vendorMutations = {
    createMutation: useCreateVendor(),
    updateMutation: useUpdateVendor(),
    deleteMutation: useDeleteVendor()
  };
  const vendorCrud = useConvexCrudState<Vendor>(vendorMutations);
  const vendorTable = useTableState(vendorsData, ["name", "type", "phone"]);

  const channelMutations = {
    createMutation: useCreateIncomeChannel(),
    updateMutation: useUpdateIncomeChannel(),
    deleteMutation: useDeleteIncomeChannel()
  };
  const channelCrud = useConvexCrudState<IncomeChannel>(channelMutations);
  const channelTable = useTableState(channelsData, ["name", "type"]);

  const catMutations = {
    createMutation: useCreateExpenseCategory(),
    updateMutation: useUpdateExpenseCategory(),
    deleteMutation: useDeleteExpenseCategory()
  };
  const catCrud = useConvexCrudState<ExpenseCategory>(catMutations);
  const catTable = useTableState(categoriesData, ["name", "type"]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <TabBar<Tab> tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Vendor" && (
        <>
          <SectionHeader title="Daftar Vendor / Pemasok" />
          <VendorsNotionView />
        </>
      )}

      {activeTab === "Channel Pendapatan" && (
        <>
          <SectionHeader title="Daftar Channel Pendapatan" />
          <DataTable<IncomeChannel>
            data={channelTable.sortedItems}
            columns={channelColumns}
            search={channelTable.search}
            onSearchChange={channelTable.setSearch}
            sort={channelTable.sort}
            onToggleSort={channelTable.toggleSort}
            onReorder={channelTable.setOrderedItems}
            onAdd={channelCrud.openCreate}
            onEdit={channelCrud.openEdit}
            onDelete={channelCrud.openDelete}
            onImport={async (items) => {
              for (const i of items) {
                if (i.name) await channelCrud.onCreate(i);
              }
            }}
            entityName="Channel Pendapatan"
          />
          <CrudDialog<IncomeChannel>
            open={channelCrud.isOpen} mode={channelCrud.mode} item={channelCrud.selectedItem}
            fields={channelFields} entityName="Channel Pendapatan" onClose={channelCrud.close}
            onSubmit={channelCrud.mode === "edit" ? channelCrud.onUpdate : channelCrud.onCreate}
            onDelete={channelCrud.onDelete}
          />
        </>
      )}

      {activeTab === "Kategori Pengeluaran" && (
        <>
          <SectionHeader title="Kategori Pengeluaran" />
          <DataTable<ExpenseCategory>
            data={catTable.sortedItems}
            columns={categoryColumns}
            search={catTable.search}
            onSearchChange={catTable.setSearch}
            sort={catTable.sort}
            onToggleSort={catTable.toggleSort}
            onReorder={catTable.setOrderedItems}
            onAdd={catCrud.openCreate}
            onEdit={catCrud.openEdit}
            onDelete={catCrud.openDelete}
            onImport={async (items) => {
              for (const i of items) {
                if (i.name) await catCrud.onCreate(i);
              }
            }}
            entityName="Kategori"
          />
          <CrudDialog<ExpenseCategory>
            open={catCrud.isOpen} mode={catCrud.mode} item={catCrud.selectedItem}
            fields={categoryFields} entityName="Kategori" onClose={catCrud.close}
            onSubmit={catCrud.mode === "edit" ? catCrud.onUpdate : catCrud.onCreate}
            onDelete={catCrud.onDelete}
          />
        </>
      )}
    </motion.div>
  );
}
