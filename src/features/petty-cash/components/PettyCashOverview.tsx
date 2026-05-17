"use client";

import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader, DataTable, CrudDialog } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PettyCashRequest } from "@/shared/types";
import { formatRpFull } from "@/shared/lib";
import { usePettyCashRequests, useCreatePettyCashRequest, useUpdatePettyCashRequest, useDeletePettyCashRequest } from "../api";
import { useQuery } from "convex/react";
import { useBranchScope } from "@/features/dashboard";
import { api } from "../../../../convex/_generated/api";

const fields: FieldConfig[] = [
  { key: "requestedBy", label: "Diminta Oleh", required: true },
  { key: "purposeCategory", label: "Kategori", type: "select", options: [
    { label: "Utilitas", value: "Utilitas" },
    { label: "Bahan Baku", value: "Bahan Baku" },
    { label: "Maintenance", value: "Maintenance" },
    { label: "Transfer Owner", value: "Transfer Owner" },
    { label: "Lain-lain", value: "Lain-lain" },
  ]},
  { key: "requestedAmount", label: "Jumlah Request (Rp)", type: "number", required: true },
  { key: "approvedAmount", label: "Jumlah Approved (Rp)", type: "number" },
  { key: "actualAmount", label: "Realisasi (Rp)", type: "number" },
  { key: "notes", label: "Catatan" },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Requested", value: "requested" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Disbursed", value: "disbursed" },
    { label: "Closed", value: "closed" },
  ]},
  { key: "requestDate", label: "Tanggal", type: "date" },
];

const columns: Column<PettyCashRequest>[] = [
  { key: "requestDate", label: "Tanggal", className: "text-xs" },
  { key: "requestedBy", label: "Diminta Oleh" },
  { key: "purposeCategory", label: "Kategori", render: (v) => <span className="text-muted-foreground">{v}</span> },
  { key: "requestedAmount", label: "Request", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "approvedAmount", label: "Approved", className: "text-right font-mono-data", render: (v) => v > 0 ? <span className="text-success">{formatRpFull(v)}</span> : "-" },
  { key: "actualAmount", label: "Realisasi", className: "text-right font-mono-data", render: (v, item) => {
    if (v === 0) return "-";
    const variance = item.approvedAmount - v;
    return (
      <div>
        <span>{formatRpFull(v)}</span>
        {variance !== 0 && <span className={`text-xs ml-1 ${variance > 0 ? "text-success" : "text-destructive"}`}>({variance > 0 ? "+" : ""}{formatRpFull(variance)})</span>}
      </div>
    );
  }},
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

export function PettyCashOverview() {
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const currentBranchId = scopeBranchId ?? branches?.[0]?._id;

  const rawRequests = usePettyCashRequests(currentBranchId || "");
  const reportExpenses = useQuery(api.features.reports.queries.getExpensesByBranch, currentBranchId ? { branchId: currentBranchId } : "skip");
  type ReportExpense = NonNullable<typeof reportExpenses>[number];

  const manualData = (rawRequests || []).map(r => ({ ...r, id: r._id })) as unknown as PettyCashRequest[];
  const reportData: PettyCashRequest[] = (reportExpenses || []).map((e: ReportExpense) => ({
    id: e._id,
    _id: e._id,
    requestDate: e.expenseDate ?? "",
    requestedBy: e.categoryLabel ?? e.categoryType ?? "",
    purposeCategory: e.categoryType === "cogs" ? "Bahan Baku" : e.categoryType === "utility" ? "Utilitas" : "Lain-lain",
    requestedAmount: e.amount ?? 0,
    approvedAmount: e.amount ?? 0,
    actualAmount: e.amount ?? 0,
    notes: e.description ?? "",
    status: "closed" as const,
    branchId: e.branchId,
    _creationTime: e._creationTime,
  })) as unknown as PettyCashRequest[];
  const requestsData = [...manualData, ...reportData];

  const createPettyCashRequest = useCreatePettyCashRequest();
  const updatePettyCashRequest = useUpdatePettyCashRequest();
  const deletePettyCashRequest = useDeletePettyCashRequest();
  const crud = useConvexCrudState<PettyCashRequest>({
    createMutation: createPettyCashRequest,
    updateMutation: updatePettyCashRequest,
    deleteMutation: deletePettyCashRequest,
  });
  const table = useTableState(requestsData, ["requestedBy", "purposeCategory", "notes", "status"]);

  const customCreate = async (data: PettyCashRequest) => {
    if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
    await crud.onCreate({
      ...data,
      branchId: currentBranchId,
      approvedAmount: data.approvedAmount || 0,
      actualAmount: data.actualAmount || 0,
      hasAttachment: false,
    });
  };

  const pending = requestsData.filter(i => i.status === "requested");
  const disbursed = requestsData.filter(i => i.status === "disbursed");
  const totalDisbursed = requestsData.filter(i => ["disbursed", "closed"].includes(i.status)).reduce((s, i) => s + i.approvedAmount, 0);
  const totalUsed = requestsData.filter(i => i.status === "closed").reduce((s, i) => s + i.actualAmount, 0);
  const remaining = totalDisbursed - totalUsed;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Balance Card */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Saldo Petty Cash Aktif</p>
        <p className="text-3xl font-bold font-mono-data tracking-tight">{formatRpFull(remaining)}</p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs opacity-80">
            <ArrowDownRight className="h-3 w-3" /> Masuk: {formatRpFull(totalDisbursed)}
          </div>
          <div className="flex items-center gap-1 text-xs opacity-80">
            <ArrowUpRight className="h-3 w-3" /> Dipakai: {formatRpFull(totalUsed)}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-warning/10 rounded-xl p-3 border border-warning/20">
          <p className="label-uppercase mb-1">MENUNGGU APPROVAL</p>
          <p className="text-lg font-bold font-mono-data text-warning">{pending.length} request</p>
        </div>
        <div className="bg-info/10 rounded-xl p-3 border border-info/20">
          <p className="label-uppercase mb-1">SUDAH DICAIRKAN</p>
          <p className="text-lg font-bold font-mono-data text-info">{disbursed.length} aktif</p>
        </div>
      </div>

      {/* Pending Approval Cards */}
      {pending.length > 0 && (
        <>
          <SectionHeader title="Butuh Approval Owner" />
          {pending.map(req => (
            <div key={req.id} className="bg-card rounded-xl shadow-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium">{req.notes}</p>
                  <p className="text-xs text-muted-foreground">{req.requestedBy} · {req.requestDate}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono-data font-semibold">{formatRpFull(req.requestedAmount)}</p>
                <StatusBadge status="requested" />
              </div>
            </div>
          ))}
        </>
      )}

      {/* Full Table */}
      <SectionHeader title="Riwayat Petty Cash" />
      <DataTable<PettyCashRequest>
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
        entityName="Petty Cash"
      />
      <CrudDialog<PettyCashRequest>
        open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
        fields={fields} entityName="Petty Cash" onClose={crud.close}
        onSubmit={crud.mode === "edit" ? crud.onUpdate : customCreate}
        onDelete={crud.onDelete}
      />
    </motion.div>
  );
}
