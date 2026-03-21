import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader, DataTable, CrudDialog } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState } from "@/shared/hooks";
import type { DailySale } from "@/shared/types";
import { salesChannels, subTabs, formatRpFull } from "../lib";
import { useDailySales, useCreateSale, useUpdateSale, useDeleteSale } from "../api";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const fields: FieldConfig[] = [
  { key: "businessDate", label: "Tanggal", type: "date", required: true },
  { key: "channelName", label: "Channel", type: "select", options: salesChannels.map(c => ({ value: c, label: c })) },
  { key: "grossAmount", label: "Gross Sales", type: "number", required: true },
  { key: "platformFee", label: "Fee Platform", type: "number" },
  { key: "promoCost", label: "Potongan Promo", type: "number" },
  { key: "referenceNo", label: "No. Referensi" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "recorded", label: "Recorded" },
    { value: "pending_settlement", label: "Pending Settlement" },
    { value: "settled", label: "Settled" },
  ]},
];

const columns: Column<DailySale>[] = [
  { key: "businessDate", label: "Tanggal", className: "text-xs" },
  { key: "channelName", label: "Channel" },
  { key: "grossAmount", label: "Gross Sales", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "platformFee", label: "Fee", className: "text-right font-mono-data text-destructive", render: (v) => v > 0 ? `-${formatRpFull(v)}` : "-" },
  { key: "promoCost", label: "Promo", className: "text-right font-mono-data text-destructive", render: (v) => v > 0 ? `-${formatRpFull(v)}` : "-" },
  { key: "netAmount", label: "Net Amount", className: "text-right font-mono-data font-semibold text-success", render: (v) => formatRpFull(v) },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

export function DailySalesForm() {
  const [sub, setSub] = useState(0);

  // Auto-detect a branch ID for demo purposes
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const currentBranchId = branches?.[0]?._id;

  const rawSales = useDailySales(currentBranchId || "");
  const salesData = (rawSales || []).map(s => ({ ...s, id: s._id })) as unknown as (DailySale & { _id: string })[];

  const mutations = {
    createMutation: useCreateSale(),
    updateMutation: useUpdateSale(),
    deleteMutation: useDeleteSale(),
  };

  const crud = useConvexCrudState<DailySale & { _id: string }>(mutations as any);
  // Auto-inject branchId for creates
  const customCrudCreate = async (data: any) => {
    if(!currentBranchId) return;
    await crud.onCreate({ ...data, branchId: currentBranchId, netAmount: data.grossAmount - (data.platformFee||0) - (data.promoCost||0) });
  };

  const table = useTableState(salesData, ["channelName", "businessDate", "referenceNo"]);

  // We simply extract today's dummy date or logic
  const todaySales = salesData.filter(i => i.businessDate === "2024-05-24" || i.businessDate.startsWith(new Date().toISOString().split('T')[0]));
  const totalGross = todaySales.reduce((s, i) => s + i.grossAmount, 0);
  const totalNet = todaySales.reduce((s, i) => s + i.netAmount, 0);
  const totalFees = todaySales.reduce((s, i) => s + (i.platformFee||0) + (i.promoCost||0), 0);
  const pendingSettlement = salesData.filter(i => i.status === "pending_settlement");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map((t, i) => (
          <button key={t} onClick={() => setSub(i)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
              sub === i
                ? i === 0 ? 'bg-primary text-primary-foreground shadow-md'
                : i === 1 ? 'bg-warning text-warning-foreground shadow-md'
                : 'bg-accent text-accent-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-secondary'
            }`}
          >{t}</button>
        ))}
      </div>

      {sub === 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">GROSS SALES HARI INI</p>
              <p className="text-lg font-bold font-mono-data text-foreground">{formatRpFull(totalGross)}</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">NET AMOUNT</p>
              <p className="text-lg font-bold font-mono-data text-success">{formatRpFull(totalNet)}</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">TOTAL POTONGAN</p>
              <p className="text-lg font-bold font-mono-data text-destructive">-{formatRpFull(totalFees)}</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">PENDING SETTLEMENT</p>
              <p className="text-lg font-bold font-mono-data text-warning">{pendingSettlement.length} transaksi</p>
            </div>
          </div>

          {/* Input Form */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Input Penjualan Harian</h2>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">24 Mei 2024</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {salesChannels.map((ch) => (
              <div key={ch} className="bg-card rounded-xl shadow-card p-4 space-y-2">
                <p className="label-uppercase">{ch}</p>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Rp</span>
                  <Input type="text" defaultValue="0" className="flex-1 border-0 p-0 h-auto text-sm font-mono-data shadow-none focus-visible:ring-0" />
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full h-12 text-sm font-semibold">
            Calculate Expected Cash
          </Button>

          {/* Sales Records Table */}
          <SectionHeader title="Riwayat Penjualan" />
          <DataTable<DailySale>
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
            entityName="Penjualan"
          />
          <CrudDialog<DailySale>
            open={crud.isOpen} mode={crud.mode} item={crud.selectedItem}
            fields={fields} entityName="Penjualan" onClose={crud.close}
            onSubmit={crud.mode === "edit" ? crud.onUpdate : customCrudCreate}
            onDelete={crud.onDelete}
          />
        </>
      )}

      {sub === 1 && (
        <div className="bg-muted rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground italic">Selesaikan input penjualan harian untuk mengaktifkan form setoran malam.</p>
        </div>
      )}

      {sub === 2 && (
        <>
          <SectionHeader title="Pending Settlement dari Mitra" />
          <div className="space-y-3">
            {pendingSettlement.length === 0 ? (
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Semua settlement sudah diterima ✓</p>
              </div>
            ) : (
              pendingSettlement.map(sale => (
                <div key={sale.id} className="bg-card rounded-xl shadow-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{sale.channelName}</p>
                    <p className="text-xs text-muted-foreground">{sale.businessDate} · Ref: {sale.referenceNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono-data font-semibold">{formatRpFull(sale.netAmount)}</p>
                    <StatusBadge status="pending_settlement" />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
