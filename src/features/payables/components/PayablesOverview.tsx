"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader, DataTable, CrudDialog } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState, useFilteredByDate } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  { key: "paidDate", label: "Tanggal Dibayar", type: "date" },
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
  { key: "paidDate", label: "Tgl Dibayar", className: "text-xs", render: (v) => v ? <span className="text-success">{v}</span> : <span className="text-muted-foreground/60">—</span> },
  { key: "agingDays", label: "Aging", render: (v, item) => {
    if (item.paidDate) return <span className="text-xs font-mono-data font-medium text-success">Lunas</span>;
    const color = v === 0 ? "text-success" : v <= 7 ? "text-foreground" : v <= 14 ? "text-warning" : "text-destructive";
    return <span className={`text-xs font-mono-data font-medium ${color}`}>{v} hari</span>;
  }},
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  { key: "sourceFile", label: "Sumber", render: (v) => v
    ? <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px] inline-block" title={String(v)}>{String(v)}</span>
    : <span className="text-xs text-muted-foreground/60">manual</span>,
  },
];

export function PayablesOverview() {
  const [todayMs] = useState(() => Date.now());
  const [sourceRow, setSourceRow] = useState<Payable | null>(null);
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
  const reportData: Payable[] = (reportPayables || []).map((p: ReportPayable) => {
    const isPaid = !!p.paidDate;
    const aging = p.dueDate && !isPaid
      ? Math.max(0, Math.floor((todayMs - new Date(p.dueDate).getTime()) / 86400000))
      : 0;
    return {
      id: p._id,
      _id: p._id,
      vendorName: p.supplierName ?? "",
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
      branchId: p.branchId,
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
        onRowClick={(item) => item.sourceFile && setSourceRow(item)}
        entityName="Piutang"
      />
      <CrudDialog<Payable>
        open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
        fields={fields} entityName="Piutang" onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : customCreate}
        onDelete={crud.onDelete}
      />

      {/* Source-of-row dialog (rows imported from a weekly report) */}
      <Dialog open={!!sourceRow} onOpenChange={(v) => !v && setSourceRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sumber piutang
            </DialogTitle>
            <DialogDescription className="text-xs space-y-0.5">
              <span className="block">Sheet: <span className="font-mono">PEMBELIAN KREDIT</span></span>
              {sourceRow?.sourceFile && (
                <span className="block truncate" title={sourceRow.sourceFile}>
                  File: <span className="font-mono">{sourceRow.sourceFile}</span>
                </span>
              )}
              {sourceRow?.reportPeriod && (
                <span className="block">Periode: {sourceRow.reportPeriod}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {sourceRow && (
            <div className="space-y-2 text-sm">
              <Row label="Vendor" value={sourceRow.vendorName} />
              <Row label="Bahan" value={sourceRow.description} />
              {sourceRow.invoiceNo && <Row label="No Faktur" value={sourceRow.invoiceNo} />}
              <Row label="Tgl Pembelian" value={sourceRow.invoiceDate} />
              <Row label="Total" value={formatRpFull(sourceRow.amount)} mono />
              {sourceRow.creditDays != null && (
                <Row label="Lama Kredit" value={`${sourceRow.creditDays} hari`} />
              )}
              <Row label="Jatuh Tempo" value={sourceRow.dueDate || "—"} />
              <Row
                label="Tgl Dibayar"
                value={sourceRow.paidDate || "Belum dibayar"}
                valueClass={sourceRow.paidDate ? "text-success" : "text-warning"}
              />
              {sourceRow.reportId && (
                <Link
                  href={`/laporan/${sourceRow.reportId}`}
                  onClick={() => setSourceRow(null)}
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline"
                >
                  Buka laporan sumber <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
