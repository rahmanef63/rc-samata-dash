"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader, DataTable, CrudDialog } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DailyClosing, OwnerTransfer } from "@/shared/types";
import { purposeLabels } from "../lib";
import { formatRpFull } from "@/shared/lib";
import { useState } from "react";
import { TabBar } from "@/shared/components";
import { useListClosings, useListTransfers, useCreateClosing, useUpdateClosing, useCreateTransfer, useDeleteTransfer } from "../api";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const closingFields: FieldConfig[] = [
  { key: "businessDate", label: "Tanggal", type: "date", required: true },
  { key: "openingCash", label: "Opening Cash (Rp)", type: "number" },
  { key: "cashSales", label: "Cash Sales (Rp)", type: "number" },
  { key: "nonCashSales", label: "Non-Cash Sales (Rp)", type: "number" },
  { key: "expensesPaidCash", label: "Expense Cash (Rp)", type: "number" },
  { key: "actualCash", label: "Actual Cash (Rp)", type: "number", required: true },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Open", value: "open" },
    { label: "Submitted", value: "submitted" },
    { label: "Verified", value: "verified" },
  ]},
];

const closingColumns: Column<DailyClosing>[] = [
  { key: "businessDate", label: "Tanggal" },
  { key: "cashSales", label: "Cash Sales", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "nonCashSales", label: "Non-Cash", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "expensesPaidCash", label: "Expense", className: "text-right font-mono-data text-destructive", render: (v) => `-${formatRpFull(v)}` },
  { key: "expectedCash", label: "Expected", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "actualCash", label: "Actual", className: "text-right font-mono-data font-semibold", render: (v) => formatRpFull(v) },
  { key: "difference", label: "Selisih", className: "text-right font-mono-data", render: (v) => {
    const color = v === 0 ? "text-success" : "text-destructive";
    return <span className={`font-semibold ${color}`}>{v === 0 ? "0" : formatRpFull(v)}</span>;
  }},
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

const transferFields: FieldConfig[] = [
  { key: "transferDate", label: "Tanggal Transfer", type: "date", required: true },
  { key: "direction", label: "Arah", type: "select", options: [
    { label: "Branch → Owner", value: "branch_to_owner" },
    { label: "Owner → Branch", value: "owner_to_branch" },
  ]},
  { key: "purpose", label: "Tujuan", type: "select", options: [
    { label: "Setoran Malam", value: "night_transfer" },
    { label: "Top-up Petty Cash", value: "petty_cash_topup" },
    { label: "Dana Bayar Hutang", value: "payable_payment_fund" },
    { label: "Adjustment", value: "adjustment" },
  ]},
  { key: "amount", label: "Jumlah (Rp)", type: "number", required: true },
  { key: "referenceNo", label: "No. Referensi" },
];

const transferColumns: Column<OwnerTransfer>[] = [
  { key: "transferDate", label: "Tanggal" },
  { key: "direction", label: "Arah", render: (v) => <StatusBadge status={v} /> },
  { key: "purpose", label: "Tujuan", render: (v) => <span className="text-xs">{purposeLabels[v] || v}</span> },
  { key: "amount", label: "Jumlah", className: "text-right font-mono-data font-semibold", render: (v, item) => {
    const color = item.direction === "branch_to_owner" ? "text-success" : "text-info";
    return <span className={color}>{formatRpFull(v)}</span>;
  }},
  { key: "referenceNo", label: "Ref", className: "font-mono-data text-xs text-muted-foreground" },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

const subTabs = ["Daily Closing", "Transfer Owner"] as const;
type SubTab = typeof subTabs[number];

export function DailyClosingPanel() {
  const [activeTab, setActiveTab] = useState<SubTab>("Daily Closing");

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const currentBranchId = branches?.[0]?._id;

  const rawClosings = useListClosings(currentBranchId || "");
  const closingsData = (rawClosings || []).map(c => ({ ...c, id: c._id })) as unknown as DailyClosing[];

  const rawTransfers = useListTransfers(currentBranchId || "");
  const transfersData = (rawTransfers || []).map(t => ({ ...t, id: t._id })) as unknown as OwnerTransfer[];

  const closingMutations = {
    createMutation: useCreateClosing(),
    updateMutation: useUpdateClosing(),
    deleteMutation: async () => {},
  };
  const closingCrud = useConvexCrudState<DailyClosing>(closingMutations as any);
  const closingTable = useTableState(closingsData, ["businessDate", "status"]);

  const transferMutations = {
    createMutation: useCreateTransfer(),
    updateMutation: async () => {},
    deleteMutation: useDeleteTransfer(),
  };
  const transferCrud = useConvexCrudState<OwnerTransfer>(transferMutations as any);
  const transferTable = useTableState(transfersData, ["transferDate", "referenceNo", "purpose"]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const todayClosing = closingsData.find(c => c.businessDate === today);
  const totalTransferToOwner = transfersData.filter(t => t.direction === "branch_to_owner").reduce((s, t) => s + t.amount, 0);
  const totalTransferFromOwner = transfersData.filter(t => t.direction === "owner_to_branch").reduce((s, t) => s + t.amount, 0);

  const customCreateClosing = async (data: any) => {
    if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
    const openingCash = Number(data.openingCash) || 0;
    const cashSales = Number(data.cashSales) || 0;
    const nonCashSales = Number(data.nonCashSales) || 0;
    const expensesPaidCash = Number(data.expensesPaidCash) || 0;
    const actualCash = Number(data.actualCash) || 0;
    const expectedCash = openingCash + cashSales - expensesPaidCash;
    const difference = actualCash - expectedCash;
    await closingCrud.onCreate({
      ...data,
      branchId: currentBranchId,
      openingCash, cashSales, nonCashSales, expensesPaidCash, actualCash,
      expectedCash, difference,
      submittedBy: "owner",
      submittedAt: new Date().toISOString(),
    });
  };

  const customCreateTransfer = async (data: any) => {
    if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
    await transferCrud.onCreate({
      ...data,
      branchId: currentBranchId,
      amount: Number(data.amount) || 0,
      referenceNo: data.referenceNo || "",
      status: "pending",
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <TabBar<SubTab> tabs={subTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Daily Closing" && (
        <>
          {todayClosing && (
            <div className={`rounded-xl p-4 border ${todayClosing.difference === 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                {todayClosing.difference === 0 ? <Check className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                <p className="text-sm font-semibold">Closing Hari Ini - {todayClosing.businessDate}</p>
                <StatusBadge status={todayClosing.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <p className="label-uppercase">Opening Cash</p>
                  <p className="text-sm font-mono-data">{formatRpFull(todayClosing.openingCash)}</p>
                </div>
                <div>
                  <p className="label-uppercase">Cash Sales</p>
                  <p className="text-sm font-mono-data text-success">+{formatRpFull(todayClosing.cashSales)}</p>
                </div>
                <div>
                  <p className="label-uppercase">Expense Cash</p>
                  <p className="text-sm font-mono-data text-destructive">-{formatRpFull(todayClosing.expensesPaidCash)}</p>
                </div>
                <div>
                  <p className="label-uppercase">Selisih</p>
                  <p className={`text-sm font-mono-data font-bold ${todayClosing.difference === 0 ? "text-success" : "text-destructive"}`}>
                    {todayClosing.difference === 0 ? "Rp 0 ✓" : formatRpFull(todayClosing.difference)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <SectionHeader title="Riwayat Daily Closing" />
          <DataTable<DailyClosing>
            data={closingTable.sortedItems}
            columns={closingColumns}
            search={closingTable.search}
            onSearchChange={closingTable.setSearch}
            sort={closingTable.sort}
            onToggleSort={closingTable.toggleSort}
            onReorder={closingTable.setOrderedItems}
            onAdd={closingCrud.openCreate}
            onEdit={closingCrud.openEdit}
            onDelete={closingCrud.openDelete}
            entityName="Closing"
          />
          <CrudDialog<DailyClosing>
            open={closingCrud.isOpen} mode={closingCrud.mode} item={closingCrud.selectedItem}
            fields={closingFields} entityName="Daily Closing" onClose={closingCrud.close}
            onSubmit={closingCrud.mode === "edit" ? closingCrud.onUpdate : customCreateClosing}
            onDelete={closingCrud.onDelete}
          />
        </>
      )}

      {activeTab === "Transfer Owner" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-success/10 rounded-xl p-4 border border-success/20">
              <p className="label-uppercase mb-1">TOTAL KE OWNER</p>
              <p className="text-xl font-bold font-mono-data text-success">{formatRpFull(totalTransferToOwner)}</p>
            </div>
            <div className="bg-info/10 rounded-xl p-4 border border-info/20">
              <p className="label-uppercase mb-1">TOTAL DARI OWNER</p>
              <p className="text-xl font-bold font-mono-data text-info">{formatRpFull(totalTransferFromOwner)}</p>
            </div>
          </div>

          <SectionHeader title="Riwayat Transfer" />
          <DataTable<OwnerTransfer>
            data={transferTable.sortedItems}
            columns={transferColumns}
            search={transferTable.search}
            onSearchChange={transferTable.setSearch}
            sort={transferTable.sort}
            onToggleSort={transferTable.toggleSort}
            onReorder={transferTable.setOrderedItems}
            onAdd={transferCrud.openCreate}
            onEdit={transferCrud.openEdit}
            onDelete={transferCrud.openDelete}
            entityName="Transfer"
          />
          <CrudDialog<OwnerTransfer>
            open={transferCrud.isOpen} mode={transferCrud.mode} item={transferCrud.selectedItem}
            fields={transferFields} entityName="Transfer" onClose={transferCrud.close}
            onSubmit={transferCrud.mode === "edit" ? transferCrud.onUpdate : customCreateTransfer}
            onDelete={transferCrud.onDelete}
          />
        </>
      )}
    </motion.div>
  );
}
