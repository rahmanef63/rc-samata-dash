"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { SectionHeader, DataTable, CrudDialog, RowSourceDialog, deriveSourceFromEtl } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState, useFilteredByDate } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Payable } from "@/shared/types";
import { formatRpFull } from "@/shared/lib";
import { usePayables, useCreatePayable, useUpdatePayable, useDeletePayable } from "../api";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const fields: FieldConfig[] = [
  { key: "vendorName", label: "Vendor", required: true },
  { key: "description", label: "Deskripsi", required: true },
  { key: "amount", label: "Jumlah (Rp)", type: "number", required: true },
  { key: "paidAmount", label: "Sudah Dibayar (Rp)", type: "number" },
  { key: "invoiceDate", label: "Tanggal Invoice", type: "date" },
  { key: "dueDate", label: "Jatuh Tempo", type: "date" },
  { key: "paidDate", label: "Tanggal Dibayar", type: "date" },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Open", value: "open" },
    { label: "Partial", value: "partial" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
  ]},
];

const columns: Column<Payable>[] = [
  { key: "vendorName", label: "Vendor", render: (v, item) => {
    const vendorId = (item as Payable & { vendorId?: string }).vendorId;
    if (!vendorId) return <span>{v}</span>;
    return (
      <Link
        href={`/finance/vendors/${vendorId}`}
        className="inline-flex items-center gap-1 hover:text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {v}
        <ExternalLink className="h-2.5 w-2.5 opacity-50" />
      </Link>
    );
  }},
  { key: "description", label: "Deskripsi", render: (v) => <span className="text-xs text-muted-foreground">{v}</span> },
  { key: "amount", label: "Total", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "paidAmount", label: "Dibayar", className: "text-right font-mono-data", render: (v) => <span className="text-success">{formatRpFull(v)}</span> },
  { key: "dueDate", label: "Jatuh Tempo", className: "text-xs" },
  { key: "paidDate", label: "Tgl Dibayar", className: "text-xs", render: (v) => v ? <span className="text-success">{v}</span> : <span className="text-muted-foreground/60">—</span> },
  { key: "agingDays", label: "Aging", render: (v, item) => {
    if (item.paidDate) return <span className="text-xs font-mono-data font-medium text-success">Lunas</span>;
    const color = v === 0 ? "text-success" : v <= 7 ? "text-foreground" : v <= 14 ? "text-warning" : "text-destructive";
    return <span className={`text-xs font-mono-data font-medium ${color}`}>{v} hari</span>;
  }},
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  { key: "etlSource", label: "Sumber", render: (v) => v
    ? <span className="text-xs text-muted-foreground font-mono">ETL</span>
    : <span className="text-xs text-muted-foreground/60">manual</span>,
  },
];

export function PayablesOverview() {
  const [todayMs] = useState(() => Date.now());
  const [sourceRow, setSourceRow] = useState<Payable | null>(null);

  const rawVendors = useQuery(api.features.masterData.queries.listVendors, {});

  const rawPayables = usePayables();
  const reportPayables = useQuery(api.features.reports.queries.getPayablesByBranch, {});
  type ReportPayable = NonNullable<typeof reportPayables>[number];

  // Resolve vendorId from name for report-derived payables (no real
  // vendorId column — they come from weekly upload's supplierName text)
  const vendorIdByName = new Map<string, string>(
    (rawVendors ?? []).map((v) => [v.name.trim().toLowerCase(), v._id]),
  );

  const manualPayables = (rawPayables || []).map(p => ({
    ...p,
    id: p._id,
    agingDays: p.dueDate ? Math.max(0, Math.floor((todayMs - new Date(p.dueDate).getTime()) / 86400000)) : 0,
  })) as unknown as Payable[];
  const reportData: Payable[] = (reportPayables || []).map((p: ReportPayable) => {
    const isPaid = !!p.paidDate;
    const aging = p.dueDate && !isPaid
      ? Math.max(0, Math.floor((todayMs - new Date(p.dueDate).getTime()) / 86400000))
      : 0;
    const supplierName = p.supplierName ?? "";
    return {
      id: p._id,
      _id: p._id,
      vendorId: vendorIdByName.get(supplierName.trim().toLowerCase()) ?? "",
      vendorName: supplierName,
      description: p.itemName ?? "",
      amount: p.totalAmount ?? 0,
      paidAmount: isPaid ? (p.totalAmount ?? 0) : 0,
      invoiceDate: p.purchaseDate ?? "",
      dueDate: p.dueDate ?? "",
      paidDate: p.paidDate,
      creditDays: p.creditDays,
      invoiceNo: p.invoiceNo,
      agingDays: aging,
      status: isPaid
        ? ("paid" as const)
        : (p.dueDate && new Date(p.dueDate).getTime() < todayMs
            ? ("overdue" as const)
            : ("open" as const)),
      _creationTime: p._creationTime,
      reportId: p.reportId,
      sourceFile: p.sourceFile,
      reportPeriod: p.reportPeriod,
    };
  }) as unknown as Payable[];
  const payablesAll = [...manualPayables, ...reportData];
  // DRY date filter — when paid, filter by paidDate so closed payables
  // appear in the period they were settled. Else fall back to dueDate.
  const payablesByPaid = useFilteredByDate(payablesAll.filter(p => p.paidDate), "paidDate");
  const payablesByDue  = useFilteredByDate(payablesAll.filter(p => !p.paidDate), "dueDate");
  const payablesData = [...payablesByPaid, ...payablesByDue];

  const createPayable = useCreatePayable();
  const updatePayable = useUpdatePayable();
  const deletePayable = useDeletePayable();
  const crud = useConvexCrudState<Payable>({
    createMutation: createPayable,
    updateMutation: updatePayable,
    deleteMutation: deletePayable,
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "partial" | "paid" | "overdue">("all");
  const statusFilteredData = useMemo(() => (
    statusFilter === "all" ? payablesData : payablesData.filter(p => p.status === statusFilter)
  ), [payablesData, statusFilter]);
  const table = useTableState(statusFilteredData, ["vendorName", "description", "status"]);

  const customCreate = async (data: Payable) => {
    const vendor = rawVendors?.find(v => v.name === data.vendorName);
    await crud.onCreate({
      ...data,
      vendorId: vendor?._id,
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
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mr-1">Status:</span>
        {(["all", "open", "partial", "paid", "overdue"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={`text-[10px] px-2 py-1 rounded font-semibold uppercase ${statusFilter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {k === "all" ? `Semua (${payablesData.length})` : `${k} (${payablesData.filter(p => p.status === k).length})`}
          </button>
        ))}
      </div>
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
        onRowClick={(item) => setSourceRow(item)}
        entityName="Piutang"
      />
      <CrudDialog<Payable>
        open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
        fields={fields} entityName="Piutang" onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : customCreate}
        onDelete={crud.onDelete}
      />

      <RowSourceDialog
        open={!!sourceRow}
        onClose={() => setSourceRow(null)}
        title="Detail Piutang"
        row={sourceRow}
        source={sourceRow ? deriveSourceFromEtl(sourceRow) : undefined}
        fields={sourceRow ? [
          { label: "Vendor", value: sourceRow.vendorName },
          { label: "Bahan / Deskripsi", value: sourceRow.description },
          { label: "No Faktur", value: sourceRow.invoiceNo },
          { label: "Tgl Invoice", value: sourceRow.invoiceDate },
          { label: "Jatuh Tempo", value: sourceRow.dueDate },
          { label: "Lama Kredit", value: sourceRow.creditDays != null ? `${sourceRow.creditDays} hari` : undefined },
          { label: "Total", value: formatRpFull(sourceRow.amount) },
          { label: "Dibayar", value: formatRpFull(sourceRow.paidAmount) },
          { label: "Tgl Dibayar", value: sourceRow.paidDate || "Belum dibayar" },
          { label: "Status", value: sourceRow.status },
        ] : []}
      />
    </motion.div>
  );
}

function Row({
  label, value, mono, valueClass,
}: { label: string; value: string; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-dashed last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`${mono ? "font-mono-data font-semibold" : ""} text-right truncate ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
