import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { SectionHeader, DataTable, CrudDialog } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useCrudState, useTableState } from "@/shared/hooks";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Payable } from "@/shared/types";
import { mockPayables } from "../lib";
import { formatRpFull } from "@/shared/lib";

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
  { key: "agingDays", label: "Aging", render: (v, item) => {
    const color = v === 0 ? "text-success" : v <= 7 ? "text-foreground" : v <= 14 ? "text-warning" : "text-destructive";
    return <span className={`text-xs font-mono-data font-medium ${color}`}>{v} hari</span>;
  }},
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
];

export function PayablesOverview() {
  const crud = useCrudState<Payable>(mockPayables);
  const table = useTableState(crud.items, ["vendorName", "description", "status"]);

  const totalOutstanding = crud.items.filter(i => i.status !== "paid").reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const overdue = crud.items.filter(i => i.status === "overdue");

  // Aging buckets
  const aging = {
    "0-7 hari": crud.items.filter(i => i.status !== "paid" && i.agingDays <= 7).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    "8-14 hari": crud.items.filter(i => i.status !== "paid" && i.agingDays > 7 && i.agingDays <= 14).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    "15-30 hari": crud.items.filter(i => i.status !== "paid" && i.agingDays > 14 && i.agingDays <= 30).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    "30+ hari": crud.items.filter(i => i.status !== "paid" && i.agingDays > 30).reduce((s, i) => s + (i.amount - i.paidAmount), 0),
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
        onSubmit={crud.mode === "edit" ? crud.onUpdate : crud.onCreate}
        onDelete={crud.onDelete}
      />
    </motion.div>
  );
}
