import { useState } from "react";
import { motion } from "framer-motion";
import { TabBar, DataTable, CrudDialog, SectionHeader } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useCrudState, useTableState } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Vendor, IncomeChannel, ExpenseCategory } from "@/shared/types";
import {
  mockVendors, mockChannels, mockExpenseCategories,
  vendorTypeLabels, channelTypeLabels, expenseCategoryTypeLabels,
} from "../lib";

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
  { key: "isSettlementDelayed", label: "Settlement Delayed", render: (v) => <StatusBadge status={v ? "pending" : "completed"}>{v ? "Ya" : "Tidak"}</StatusBadge> },
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

const tabs = ["Vendors", "Income Channels", "Kategori Expense"] as const;
type Tab = typeof tabs[number];

export function MasterDataPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("Vendors");

  const vendorCrud = useCrudState<Vendor>(mockVendors);
  const vendorTable = useTableState(vendorCrud.items, ["name", "type", "phone"]);

  const channelCrud = useCrudState<IncomeChannel>(mockChannels);
  const channelTable = useTableState(channelCrud.items, ["name", "type"]);

  const catCrud = useCrudState<ExpenseCategory>(mockExpenseCategories);
  const catTable = useTableState(catCrud.items, ["name", "type"]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <TabBar<Tab> tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Vendors" && (
        <>
          <SectionHeader title="Daftar Vendor / Supplier" />
          <DataTable<Vendor>
            data={vendorTable.sortedItems}
            columns={vendorColumns}
            search={vendorTable.search}
            onSearchChange={vendorTable.setSearch}
            sort={vendorTable.sort}
            onToggleSort={vendorTable.toggleSort}
            onReorder={vendorTable.setOrderedItems}
            onAdd={vendorCrud.openCreate}
            onEdit={vendorCrud.openEdit}
            onDelete={vendorCrud.openDelete}
            entityName="Vendor"
          />
          <CrudDialog<Vendor>
            open={vendorCrud.isOpen} mode={vendorCrud.mode} item={vendorCrud.selectedItem}
            fields={vendorFields} entityName="Vendor" onClose={vendorCrud.close}
            onSubmit={vendorCrud.mode === "edit" ? vendorCrud.onUpdate : vendorCrud.onCreate}
            onDelete={vendorCrud.onDelete}
          />
        </>
      )}

      {activeTab === "Income Channels" && (
        <>
          <SectionHeader title="Income Channels" />
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
            entityName="Channel"
          />
          <CrudDialog<IncomeChannel>
            open={channelCrud.isOpen} mode={channelCrud.mode} item={channelCrud.selectedItem}
            fields={channelFields} entityName="Channel" onClose={channelCrud.close}
            onSubmit={channelCrud.mode === "edit" ? channelCrud.onUpdate : channelCrud.onCreate}
            onDelete={channelCrud.onDelete}
          />
        </>
      )}

      {activeTab === "Kategori Expense" && (
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
