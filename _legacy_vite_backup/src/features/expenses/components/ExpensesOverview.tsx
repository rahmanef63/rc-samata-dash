import { motion } from "framer-motion";
import { SectionHeader, DataTable, CrudDialog, ProgressBar } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useCrudState, useTableState } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Expense } from "@/shared/types";
import { mockExpenses, paymentSourceLabels } from "../lib";
import { formatRpFull } from "@/shared/lib";

const fields: FieldConfig[] = [
  { key: "description", label: "Deskripsi", required: true },
  { key: "categoryName", label: "Kategori", type: "select", options: [
    { label: "Bahan Baku", value: "Bahan Baku" },
    { label: "Utilitas", value: "Utilitas" },
    { label: "BPJS", value: "BPJS" },
    { label: "Maintenance", value: "Maintenance" },
    { label: "Lain-lain", value: "Lain-lain" },
  ]},
  { key: "amount", label: "Jumlah (Rp)", type: "number", required: true },
  { key: "vendorName", label: "Vendor" },
  { key: "paymentSource", label: "Sumber Pembayaran", type: "select", options: [
    { label: "Owner Direct", value: "owner_direct" },
    { label: "Petty Cash", value: "petty_cash" },
    { label: "Piutang / Hutang", value: "payable" },
  ]},
  { key: "status", label: "Status", type: "select", options: [
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Approved", value: "approved" },
    { label: "Paid", value: "paid" },
    { label: "Rejected", value: "rejected" },
  ]},
  { key: "expenseDate", label: "Tanggal", type: "date" },
];

const columns: Column<Expense>[] = [
  { key: "expenseDate", label: "Tanggal", className: "text-xs" },
  { key: "description", label: "Deskripsi" },
  { key: "categoryName", label: "Kategori", render: (v) => <span className="text-muted-foreground">{v}</span> },
  { key: "amount", label: "Jumlah", className: "text-right font-mono-data", render: (v) => <span className="text-destructive">{formatRpFull(v)}</span> },
  { key: "paymentSource", label: "Sumber", render: (v) => <span className="text-xs text-muted-foreground">{paymentSourceLabels[v] || v}</span> },
  { key: "vendorName", label: "Vendor", render: (v) => <span className="text-xs">{v || "-"}</span> },
  { key: "hasAttachment", label: "Bukti", render: (v) => v ? <span className="text-xs text-success">✓ Ada</span> : <span className="text-xs text-destructive">✗ Belum</span> },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

export function ExpensesOverview() {
  const crud = useCrudState<Expense>(mockExpenses);
  const table = useTableState(crud.items, ["description", "categoryName", "vendorName", "status"]);

  const totalExpenses = crud.items.reduce((s, i) => s + i.amount, 0);
  const byCategory = crud.items.reduce((acc, e) => {
    acc[e.categoryName] = (acc[e.categoryName] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const categoryBreakdown = Object.entries(byCategory)
    .map(([label, amount]) => ({ label: label.toUpperCase(), amount: formatRpFull(amount), percentage: Math.round((amount / totalExpenses) * 100) }))
    .sort((a, b) => b.percentage - a.percentage);

  const bySource = crud.items.reduce((acc, e) => {
    const src = paymentSourceLabels[e.paymentSource] || e.paymentSource;
    acc[src] = (acc[src] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleImport = (items: Partial<Expense>[]) => {
    const rows = items.map((it, i) => ({
      id: `imp-${Date.now()}-${i}`,
      expenseDate: it.expenseDate || "",
      categoryId: it.categoryId || "",
      categoryName: it.categoryName || "Lain-lain",
      vendorId: it.vendorId || null,
      vendorName: it.vendorName || null,
      amount: Number(it.amount) || 0,
      description: it.description || "",
      paymentSource: (it.paymentSource as Expense["paymentSource"]) || "owner_direct",
      status: (it.status as Expense["status"]) || "draft",
      hasAttachment: false,
    }));
    crud.setItems(prev => [...prev, ...rows]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Total Pengeluaran Bulan Ini</p>
        </div>
        <p className="text-2xl font-bold font-mono-data tracking-tight mb-4">{formatRpFull(totalExpenses)}</p>
        
        {/* By Category */}
        {categoryBreakdown.map((cat) => (
          <div key={cat.label} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="label-uppercase">{cat.label}</span>
              <span className="text-xs font-mono-data">{cat.amount}</span>
            </div>
            <ProgressBar percentage={cat.percentage} />
          </div>
        ))}
      </div>

      {/* By Source */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(bySource).map(([src, amount]) => (
          <div key={src} className="bg-card rounded-xl shadow-card p-3">
            <p className="label-uppercase mb-1">{src}</p>
            <p className="text-sm font-bold font-mono-data">{formatRpFull(amount)}</p>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <SectionHeader title="Daftar Pengeluaran" />
      <DataTable<Expense>
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
        entityName="Pengeluaran"
      />
      <CrudDialog<Expense>
        open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
        fields={fields} entityName="Pengeluaran" onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : crud.onCreate}
        onDelete={crud.onDelete}
      />
    </motion.div>
  );
}
