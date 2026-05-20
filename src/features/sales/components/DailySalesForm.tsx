"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader, DataTable, CrudDialog, RowSourceDialog, deriveSourceFromEtl } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState, useFilteredByDate } from "@/shared/hooks";
import type { DailySale } from "@/shared/types";
import { salesChannels, subTabs, formatRpFull } from "../lib";
import { labelChannel } from "../constants/channels";
import { toast } from "sonner";
import { useDailySales, useCreateSale, useUpdateSale, useDeleteSale } from "../api";
import { useQuery } from "convex/react";
import { useBranchScope } from "@/features/dashboard";
import { api } from "../../../../convex/_generated/api";

const fields: FieldConfig[] = [
  { key: "businessDate", label: "Tanggal", type: "date", required: true },
  { key: "channelName", label: "Channel", type: "select", options: salesChannels.map(c => ({ value: c, label: c })) },
  { key: "grossAmount", label: "Penjualan Kotor", type: "number", required: true },
  { key: "platformFee", label: "Fee Platform", type: "number" },
  { key: "promoCost", label: "Potongan Promo", type: "number" },
  { key: "referenceNo", label: "No. Referensi" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "recorded", label: "Tercatat" },
    { value: "pending_settlement", label: "Menunggu Settlement" },
    { value: "settled", label: "Selesai" },
  ]},
];

const columns: Column<DailySale>[] = [
  { key: "businessDate", label: "Tanggal", className: "text-xs" },
  { key: "channelName", label: "Channel" },
  { key: "grossAmount", label: "Penjualan Kotor", className: "text-right font-mono-data", render: (v) => formatRpFull(v) },
  { key: "platformFee", label: "Biaya", className: "text-right font-mono-data text-destructive", render: (v) => v > 0 ? `-${formatRpFull(v)}` : "-" },
  { key: "promoCost", label: "Promo", className: "text-right font-mono-data text-destructive", render: (v) => v > 0 ? `-${formatRpFull(v)}` : "-" },
  { key: "netAmount", label: "Nilai Bersih", className: "text-right font-mono-data font-semibold text-success", render: (v) => formatRpFull(v) },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

export function DailySalesForm() {
  const [sub, setSub] = useState(0);
  const [sourceRow, setSourceRow] = useState<DailySale | null>(null);

  // Auto-detect a branch ID for demo purposes
  const { branchId: scopeBranchId, branches } = useBranchScope();
  const currentBranchId = scopeBranchId ?? branches?.[0]?._id;

  const rawSales = useDailySales(currentBranchId || "");
  const reportSales = useQuery(api.features.reports.queries.getSalesByBranch, currentBranchId ? { branchId: currentBranchId } : "skip");
  type ReportSale = NonNullable<typeof reportSales>[number];

  // Merge manual entries + uploaded report data (transformed to DailySale shape)
  const manualData = (rawSales || []).map(s => ({ ...s, id: s._id })) as unknown as DailySale[];
  const reportData: DailySale[] = (reportSales || []).map((s: ReportSale) => ({
    id: s._id,
    _id: s._id,
    businessDate: s.businessDate ?? "",
    channelName: labelChannel(s.channel ?? "dine_in"),
    grossAmount: s.amount ?? 0,
    platformFee: 0,
    promoCost: 0,
    netAmount: s.amount ?? 0,
    cashReceivedAmount: 0,
    status: "recorded" as const,
    referenceNo: s.productName ?? "",
    branchId: s.branchId,
    _creationTime: s._creationTime,
  })) as unknown as DailySale[];
  const salesAll = [...manualData, ...reportData];
  const salesData = useFilteredByDate(salesAll, "businessDate");

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();
  const crud = useConvexCrudState<DailySale>({
    createMutation: createSale,
    updateMutation: updateSale,
    deleteMutation: deleteSale,
  });
  // Auto-inject branchId for creates
  const customCrudCreate = async (data: DailySale) => {
    if(!currentBranchId) { toast.error("Cabang belum tersedia. Tambahkan di Master Data."); return; }
    await crud.onCreate({
      ...data,
      branchId: currentBranchId,
      netAmount: data.grossAmount - (data.platformFee || 0) - (data.promoCost || 0),
    });
  };

  const table = useTableState(salesData, ["channelName", "businessDate", "referenceNo"]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todaySales = salesData.filter(i => i.businessDate === today);
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
              <p className="label-uppercase mb-1">NILAI BERSIH</p>
              <p className="text-lg font-bold font-mono-data text-success">{formatRpFull(totalNet)}</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">TOTAL POTONGAN</p>
              <p className="text-lg font-bold font-mono-data text-destructive">-{formatRpFull(totalFees)}</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">SETTLEMENT TERTUNDA</p>
              <p className="text-lg font-bold font-mono-data text-warning">{pendingSettlement.length} transaksi</p>
            </div>
          </div>

          {/* Input Form */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Input Penjualan Harian</h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {salesChannels.map((ch) => (
              <div key={ch} className="bg-card rounded-xl shadow-card p-4 space-y-2">
                <p className="label-uppercase">{ch}</p>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Rp</span>
                  <Input type="number" inputMode="numeric" min="0" defaultValue="0" className="flex-1 border-0 p-0 h-auto text-sm font-mono-data shadow-none focus-visible:ring-0" />
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full h-12 text-sm font-semibold">
            Hitung Estimasi Kas
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
            onRowClick={(item) => setSourceRow(item)}
            entityName="Penjualan"
          />
          <RowSourceDialog
            open={!!sourceRow}
            onClose={() => setSourceRow(null)}
            title="Detail Penjualan"
            row={sourceRow}
            source={sourceRow ? deriveSourceFromEtl(sourceRow) : undefined}
            fields={sourceRow ? [
              { label: "Tanggal", value: sourceRow.businessDate },
              { label: "Channel", value: sourceRow.channelName },
              { label: "Gross", value: formatRpFull(sourceRow.grossAmount) },
              { label: "Platform Fee", value: formatRpFull(sourceRow.platformFee) },
              { label: "Promo", value: formatRpFull(sourceRow.promoCost) },
              { label: "Net", value: formatRpFull(sourceRow.netAmount) },
              { label: "Cash Diterima", value: formatRpFull(sourceRow.cashReceivedAmount) },
              { label: "Settlement", value: sourceRow.settlementDate },
              { label: "No. Ref", value: sourceRow.referenceNo },
              { label: "Status", value: sourceRow.status },
            ] : []}
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
