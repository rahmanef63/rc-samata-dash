"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { SectionHeader, DataTable, CrudDialog, ProgressBar } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState, useFilteredByDate } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Expense } from "@/shared/types";
import { paymentSourceLabels } from "../lib";
import { formatRpFull } from "@/shared/lib";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "../api";
import { useQuery } from "convex/react";
import { useBranchScope } from "@/features/dashboard";
import { api } from "../../../../convex/_generated/api";

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
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const currentBranchId = scopeBranchId ?? branches?.[0]?._id;

  const rawCategories = useQuery(api.features.masterData.queries.listExpenseCategories);
  const rawVendors = useQuery(api.features.masterData.queries.listVendors, {});

  const rawExpenses = useExpenses(currentBranchId || "");
  const reportExpenses = useQuery(api.features.reports.queries.getExpensesByBranch, currentBranchId ? { branchId: currentBranchId } : "skip");
  type ReportExpense = NonNullable<typeof reportExpenses>[number];

  const manualExpenses = (rawExpenses || []).map(e => ({ ...e, id: e._id })) as unknown as Expense[];
  const reportData: Expense[] = (reportExpenses || []).map((e: ReportExpense) => ({
    id: e._id,
    _id: e._id,
    expenseDate: e.expenseDate ?? "",
    description: e.description ?? "",
    categoryName: e.categoryLabel ?? e.categoryType ?? "",
    amount: e.amount ?? 0,
    paymentSource: "petty_cash",
    vendorName: "",
    hasAttachment: false,
    status: "approved" as const,
    branchId: e.branchId,
    _creationTime: e._creationTime,
  })) as unknown as Expense[];
  const expensesAll = [...manualExpenses, ...reportData];
  // DRY date filter — header DateRangePicker controls visibility.
  const expensesData = useFilteredByDate(expensesAll, "expenseDate");

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const crud = useConvexCrudState<Expense>({
    createMutation: createExpense,
    updateMutation: updateExpense,
    deleteMutation: deleteExpense,
  });
  const table = useTableState(expensesData, ["description", "categoryName", "vendorName", "status"]);

  const categoryOptions = (rawCategories || []).map(c => ({ label: c.name, value: c.name }));
  const vendorOptions = (rawVendors || []).map(v => ({ label: v.name, value: v.name }));

  const fields: FieldConfig[] = [
    { key: "description", label: "Deskripsi", required: true },
    { key: "categoryName", label: "Kategori", type: "select", options: categoryOptions.length > 0 ? categoryOptions : [
      { label: "Bahan Baku", value: "Bahan Baku" },
      { label: "Utilitas", value: "Utilitas" },
      { label: "BPJS", value: "BPJS" },
      { label: "Maintenance", value: "Maintenance" },
      { label: "Lain-lain", value: "Lain-lain" },
    ]},
    { key: "amount", label: "Jumlah (Rp)", type: "number", required: true },
    { key: "vendorName", label: "Vendor", type: "select", options: vendorOptions.length > 0 ? vendorOptions : [] },
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

  const customCreate = async (data: Expense) => {
    if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
    const category = rawCategories?.find(c => c.name === data.categoryName);
    const vendor = rawVendors?.find(v => v.name === data.vendorName);
    await crud.onCreate({
      ...data,
      branchId: currentBranchId,
      categoryId: category?._id ?? currentBranchId, // fallback to avoid null
      vendorId: vendor?._id ?? undefined,
      vendorName: vendor?.name ?? data.vendorName ?? undefined,
      hasAttachment: false,
    });
  };

  const totalExpenses = expensesData.reduce((s, i) => s + i.amount, 0);
  const byCategory = expensesData.reduce((acc, e) => {
    acc[e.categoryName] = (acc[e.categoryName] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const categoryBreakdown = Object.entries(byCategory)
    .map(([label, amount]) => ({ label: label.toUpperCase(), amount: formatRpFull(amount), percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0 }))
    .sort((a, b) => b.percentage - a.percentage);

  const bySource = expensesData.reduce((acc, e) => {
    const src = paymentSourceLabels[e.paymentSource] || e.paymentSource;
    acc[src] = (acc[src] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

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
        entityName="Pengeluaran"
      />
      <CrudDialog<Expense>
        open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
        fields={fields} entityName="Pengeluaran" onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : customCreate}
        onDelete={crud.onDelete}
      />
    </motion.div>
  );
}
