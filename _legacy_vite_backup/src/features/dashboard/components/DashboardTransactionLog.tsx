import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, CrudDialog, SectionHeader } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useCrudState, useTableState } from "@/shared/hooks";
import { amountColorClass } from "@/shared/lib";
import { transactionLogRows as initialRows } from "../lib";
import { itemVariants } from "@/shared/constants";
import type { TransactionLogRow } from "../types";

interface TxRow extends TransactionLogRow {
  // id already exists
}

const fields: FieldConfig[] = [
  { key: "id", label: "Transaction ID", required: true, placeholder: "#TXN-00000" },
  { key: "outlet", label: "Outlet / Entity", required: true },
  { key: "category", label: "Kategori", type: "select", options: [
    { label: "Sales Setoran", value: "Sales Setoran" },
    { label: "Petty Cash", value: "Petty Cash" },
    { label: "Mitra Income", value: "Mitra Income" },
    { label: "Expense", value: "Expense" },
  ]},
  { key: "amount", label: "Jumlah", required: true, placeholder: "+ Rp 5,240,000" },
  { key: "date", label: "Tanggal", placeholder: "23 Oct 2023, 10:20" },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Completed", value: "completed" },
    { label: "Approved", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "Settled", value: "settled" },
  ]},
];

const columns: Column<TxRow>[] = [
  { key: "id", label: "Transaction ID", className: "font-mono-data text-xs" },
  { key: "outlet", label: "Outlet / Entity" },
  { key: "category", label: "Kategori", render: (v) => <span className="text-muted-foreground">{v}</span> },
  { key: "amount", label: "Jumlah", className: "text-right", render: (v) => <span className={`font-mono-data ${amountColorClass(v)}`}>{v}</span> },
  { key: "date", label: "Tanggal", render: (v) => <span className="text-muted-foreground text-xs">{v}</span> },
  { key: "status", label: "Status", className: "text-right", render: (v) => <StatusBadge status={v} /> },
];

export function DashboardTransactionLog() {
  const crud = useCrudState<TxRow>(initialRows);
  const table = useTableState(crud.items, ["id", "outlet", "category", "amount", "status"]);

  const handleImport = (items: Partial<TxRow>[]) => {
    const rows = items.map((it, i) => ({
      id: it.id || `#TXN-IMP${i}`,
      outlet: it.outlet || "",
      category: it.category || "",
      amount: it.amount || "",
      date: it.date || "",
      status: (it.status as TxRow["status"]) || "pending",
    }));
    crud.setItems(prev => [...prev, ...rows]);
  };

  return (
    <motion.div variants={itemVariants} className="hidden md:block space-y-4">
      <SectionHeader title="Detailed Transaction Log" />
      <DataTable<TxRow>
        data={table.sortedItems}
        columns={columns}
        search={table.search}
        onSearchChange={table.setSearch}
        sort={table.sort}
        onToggleSort={table.toggleSort}
        onReorder={table.setOrderedItems}
        onAdd={crud.openCreate}
        onEdit={crud.openEdit}
        onDelete={crud.openDelete}
        onImport={handleImport}
        entityName="Transaksi"
      />

      <CrudDialog<TxRow>
        open={crud.isOpen}
        mode={crud.mode}
        item={crud.selectedItem}
        fields={fields}
        entityName="Transaksi"
        onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : crud.onCreate}
        onDelete={crud.onDelete}
      />
    </motion.div>
  );
}
