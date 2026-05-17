"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader, DataTable, CrudDialog } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState, useFilteredByDate } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Payable } from "@/shared/types";
import { formatRpFull } from "@/shared/lib";
import { usePayables, useCreatePayable, useUpdatePayable, useDeletePayable } from "../api";
import { useQuery } from "convex/react";
import { useBranchScope } from "@/features/dashboard";
import { api } from "../../../../convex/_generated/api";

const fields: FieldConfig[] = [
  { key: "vendorName", label: "Vendor", required: true },
  { key: "description", label: "Deskripsi", required: true },
  { key: "amount", label: "Jumlah (Rp)", type: "number", required: true },
  { key: "paidAmount", label: "Sudah Dibayar (Rp)", type: "number" },
  { key: "invoiceDate", label: "Tanggal Invoice", type: "date" },
  { key: "dueDate", label: "Jatuh Tempo", type: "date" },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Open", value: "open" },
    { label: "Partial", value: "partial" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
  ]},
];

const columns: Column<Payable>[] = [
  { key: "vendorName", label: "Vendor" },
  { key: "description", label: "Deskripsi", render: (v) => <span className="text-xs text-muted-foreground">{v}</span> },
  { key: "amount", label: "Total", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "paidAmount", label: "Dibayar", className: "text-right font-mono-data", render: (v) => <span className="text-success">{formatRpFull(v)}</span> },
  { key: "dueDate", label: "Jatuh Tempo", className: "text-xs" },
  { key: "agingDays", label: "Aging", render: (v) => {
    const color = v === 0 ? "text-success" : v <= 7 ? "text-foreground" : v <= 14 ? "text-warning" : "text-destructive";
    return <span className={`text-xs font-mono-data font-medium ${color}`}>{v} hari</span>;
  }},
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

export function PayablesOverview() {
  const [todayMs] = useState(() => Date.now());
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const currentBranchId = scopeBranchId ?? branches?.[0]?._id;

  const rawVendors = useQuery(api.features.masterData.queries.listVendors, {});

  const rawPayables = usePayables(currentBranchId || "");
  const reportPayables = useQuery(api.features.reports.queries.getPayablesByBranch, currentBranchId ? { branchId: currentBranchId } : "skip");
  type ReportPayable = NonNullable<typeof reportPayables>[number];

  const manualPayables = (rawPayables || []).map(p => ({
    ...p,
    id: p._id,
    agingDays: p.dueDate ? Math.max(0, Math.floor((todayMs - new Date(p.dueDate).getTime()) / 86400000)) : 0,
  })) as unknown as Payable[];
  const reportData: Payable[] = (reportPayables || []).map((p: ReportPayable) => ({
    id: p._id,
    _id: p._id,
    vendorName: p.supplierName ?? "",
    description: p.itemName ?? "",
    amount: p.totalAmount ?? 0,
    paidAmount: 0,
    invoiceDate: p.purchaseDate ?? "",
    dueDate: p.dueDate ?? "",
    agingDays: p.dueDate ? Math.max(0, Math.floor((todayMs - new Date(p.dueDate).getTime()) / 86400000)) : 0,
    status: "open" as const,
    branchId: p.branchId,
    _creationTime: p._creationTime,
  })) as unknown as Payable[];
  const payablesAll = [...manualPayables, ...reportData];
  // DRY date filter — uses dueDate (when payable falls due) so the
  // header DateRangePicker controls which payables are visible.
  const payablesData = useFilteredByDate(payablesAll, "dueDate");

  const createPayable = useCreatePayable();
  const updatePayable = useUpdatePayable();
  const deletePayable = useDeletePayable();
  const crud = useConvexCrudState<Payable>({
    createMutation: createPayable,
    updateMutation: updatePayable,
    deleteMutation: deletePayable,
  });
  const table = useTableState(payablesData, ["vendorName", "description", "status"]);

  const customCreate = async (data: Payable) => {
    if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
    const vendor = rawVendors?.find(v => v.name === data.vendorName);
    await crud.onCreate({
      ...data,
      branchId: currentBranchId,
      vendorId: vendor?._id ?? currentBranchId,
      paidAmount: Number(data.paidAmount) || 0,
      amount: Number(data.amount) || 0,
    });
  };

  const totalOutstanding = payablesData.filter(i => i.status !== "paid").reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const overdue = payablesData.filter(i => i.status === "overdue");

  const aging = {
    "0-7 hari": payablesData.filter(i => i.status !== "paid" && i.agingDays <= 7).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    "8-14 hari": payablesData.filter(i => i.status !== "paid" && i.agingDays > 7 && i.agingDays <= 14).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    "15-30 hari": payablesData.filter(i => i.status !== "paid" && i.agingDays > 14 && i.agingDays <= 30).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    "30+ hari": payablesData.filter(i => i.status !== "paid" && i.agingDays > 30).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl shadow-card p-4">
          <p className="label-uppercase mb-1">TOTAL OUTSTANDING</p>
          <p className="text-xl font-bold font-mono-data text-destructive">{formatRpFull(totalOutstanding)}</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4">
          <p className="label-uppercase mb-1">OVERDUE</p>
          <p className="text-xl font-bold font-mono-data text-destructive">{overdue.length} vendor</p>
        </div>
      </div>

      {/* Aging Buckets */}
      <SectionHeader title="Aging Piutang" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(aging).map(([bucket, amount]) => (
          <div key={bucket} className="bg-card rounded-xl shadow-card p-3">
            <p className="label-uppercase mb-1">{bucket}</p>
            <p className={`text-sm font-bold font-mono-data ${amount > 0 ? "text-warning" : "text-muted-foreground"}`}>
              {formatRpFull(amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Hutang Overdue!</p>
            {overdue.map(p => (
              <p key={p.id} className="text-xs text-muted-foreground">{p.vendorName}: {formatRpFull(p.amount - p.paidAmount)} ({p.agingDays} hari)</p>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <SectionHeader title="Daftar Piutang / Hutang Vendor" />
      <DataTable<Payable>
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
        entityName="Piutang"
      />
      <CrudDialog<Payable>
        open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
        fields={fields} entityName="Piutang" onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : customCreate}
        onDelete={crud.onDelete}
      />
    </motion.div>
  );
}
