"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader, DataTable, CrudDialog, TabBar } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useConvexCrudState, useTableState } from "@/shared/hooks";
import type { StockItem, StockMovement } from "@/shared/types";
import { movementTypeLabels } from "../lib";
import { useStockItems, useCreateStockItem, useUpdateStockItem, useDeleteStockItem, useRecordMovement, useAllStockMovements } from "../api";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// Stock Items
const itemFields: FieldConfig[] = [
  { key: "name", label: "Nama Item", required: true },
  { key: "currentQty", label: "Qty Saat Ini", type: "number", required: true },
  { key: "unit", label: "Satuan", placeholder: "kg, liter, tabung" },
  { key: "minQty", label: "Minimum Qty", type: "number" },
];

const itemColumns: Column<StockItem>[] = [
  { key: "name", label: "Nama Item" },
  { key: "currentQty", label: "Qty", className: "font-mono-data", render: (v, item) => `${v} ${item.unit}` },
  { key: "minQty", label: "Min Qty", className: "font-mono-data text-muted-foreground", render: (v, item) => `${v} ${item.unit}` },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v.toLowerCase()} /> },
];

// Stock Movements
const movementFields: FieldConfig[] = [
  { key: "itemName", label: "Nama Item", required: true },
  { key: "type", label: "Tipe", type: "select", options: Object.entries(movementTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
  { key: "qty", label: "Qty", type: "number", required: true },
  { key: "unit", label: "Satuan" },
  { key: "date", label: "Tanggal", type: "date" },
  { key: "notes", label: "Catatan" },
];

const movementColumns: Column<StockMovement>[] = [
  { key: "date", label: "Tanggal", className: "text-xs" },
  { key: "itemName", label: "Item" },
  { key: "type", label: "Tipe", render: (v) => {
    const colors: Record<string, string> = { stock_in: "completed", usage: "pending", adjustment: "review", waste: "rejected" };
    return <StatusBadge status={colors[v] || "draft"}>{movementTypeLabels[v] || v}</StatusBadge>;
  }},
  { key: "qty", label: "Qty", className: "font-mono-data", render: (v, item) => {
    const prefix = item.type === "stock_in" ? "+" : item.type === "waste" || item.type === "usage" ? "-" : "";
    const color = item.type === "stock_in" ? "text-success" : "text-destructive";
    return <span className={color}>{prefix}{Math.abs(v)} {item.unit}</span>;
  }},
  { key: "notes", label: "Catatan", render: (v) => <span className="text-xs text-muted-foreground">{v}</span> },
];

const subTabs = ["Daftar Stok", "Pergerakan Stok"] as const;
type SubTab = typeof subTabs[number];

export function InventoryOverview() {
  const [activeTab, setActiveTab] = useState<SubTab>("Daftar Stok");

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const currentBranchId = branches?.[0]?._id;

  const rawItems = useStockItems(currentBranchId || "");
  const itemsData = (rawItems || []).map(i => ({ ...i, id: i._id })) as unknown as StockItem[];

  const rawMovements = useAllStockMovements(currentBranchId || "");
  const movementsData = (rawMovements || []).map(m => ({ ...m, id: m._id })) as unknown as StockMovement[];

  const itemMutations = {
    createMutation: useCreateStockItem(),
    updateMutation: useUpdateStockItem(),
    deleteMutation: useDeleteStockItem(),
  };
  const itemCrud = useConvexCrudState<StockItem>(itemMutations as any);
  const itemTable = useTableState(itemsData, ["name", "status"]);

  const recordMovementMutation = useRecordMovement();
  const moveCrud = useConvexCrudState<StockMovement>({
    createMutation: async (data: any) => {
      if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
      const item = rawItems?.find(i => i.name === data.itemName);
      if (!item) { toast.error("Item tidak ditemukan."); return; }
      await recordMovementMutation({
        itemId: item._id,
        itemName: item.name,
        type: data.type || "stock_in",
        qty: Number(data.qty) || 0,
        unit: data.unit || item.unit,
        date: data.date || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
        notes: data.notes || "",
        branchId: currentBranchId,
      });
    },
    updateMutation: async () => {},
    deleteMutation: async () => {},
  });
  const moveTable = useTableState(movementsData, ["itemName", "type", "notes"]);

  const customCreateItem = async (data: any) => {
    if (!currentBranchId) { toast.error("Cabang belum tersedia."); return; }
    const currentQty = Number(data.currentQty) || 0;
    const minQty = Number(data.minQty) || 0;
    const status = currentQty <= 0 ? "Critical" as const : currentQty <= minQty ? "Low" as const : "Stable" as const;
    await itemCrud.onCreate({ ...data, branchId: currentBranchId, currentQty, minQty, status });
  };

  const lowStockItems = itemsData.filter(i => i.status === "Low" || i.status === "Critical");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const totalWaste = movementsData.filter(m => m.type === "waste").reduce((s, m) => s + m.qty, 0);
  const todayMovements = movementsData.filter(m => m.date === today).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <TabBar<SubTab> tabs={subTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Daftar Stok" && (
        <>
          {lowStockItems.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">{lowStockItems.length} item perlu restock</p>
                {lowStockItems.map(i => (
                  <p key={i.id} className="text-xs text-muted-foreground">{i.name}: {i.currentQty} {i.unit} (min: {i.minQty})</p>
                ))}
              </div>
              <Button size="sm" onClick={itemCrud.openCreate}>Restock</Button>
            </div>
          )}

          {itemsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-card rounded-xl shadow-card border border-border">
              <div className="w-14 h-14 mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <PackageSearch className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">Belum Ada Data Stok</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Mulai pantau persediaan bahan baku Anda. Tambahkan item stok pertama Anda sekarang.
              </p>
              <Button onClick={itemCrud.openCreate} className="gap-2">
                <span>+</span> Tambah Item Stok Pertama
              </Button>
            </div>
          ) : (
          <DataTable<StockItem>
            data={itemTable.sortedItems}
            columns={itemColumns}
            search={itemTable.search}
            onSearchChange={itemTable.setSearch}
            sort={itemTable.sort}
            onToggleSort={itemTable.toggleSort}
            onReorder={itemTable.setOrderedItems}
            onAdd={itemCrud.openCreate}
            onEdit={itemCrud.openEdit}
            onDelete={itemCrud.openDelete}
            entityName="Item Stok"
          />
          )}
          <CrudDialog<StockItem>
            open={itemCrud.isOpen} mode={itemCrud.mode} item={itemCrud.selectedItem}
            fields={itemFields} entityName="Item Stok" onClose={itemCrud.close}
            onSubmit={itemCrud.mode === "edit" ? itemCrud.onUpdate : customCreateItem}
            onDelete={itemCrud.onDelete}
          />
        </>
      )}

      {activeTab === "Pergerakan Stok" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">TOTAL PEMBOROSAN</p>
              <p className="text-lg font-bold font-mono-data text-destructive">{totalWaste} unit</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">PERGERAKAN HARI INI</p>
              <p className="text-lg font-bold font-mono-data">{todayMovements}</p>
            </div>
          </div>

          <SectionHeader title="Riwayat Pergerakan Stok" />
          <DataTable<StockMovement>
            data={moveTable.sortedItems}
            columns={movementColumns}
            search={moveTable.search}
            onSearchChange={moveTable.setSearch}
            sort={moveTable.sort}
            onToggleSort={moveTable.toggleSort}
            onReorder={moveTable.setOrderedItems}
            onAdd={moveCrud.openCreate}
            onEdit={moveCrud.openEdit}
            onDelete={moveCrud.openDelete}
            entityName="Pergerakan Stok"
          />
          <CrudDialog<StockMovement>
            open={moveCrud.isOpen} mode={moveCrud.mode} item={moveCrud.selectedItem}
            fields={movementFields} entityName="Pergerakan Stok" onClose={moveCrud.close}
            onSubmit={moveCrud.mode === "edit" ? moveCrud.onUpdate : moveCrud.onCreate}
            onDelete={moveCrud.onDelete}
          />
        </>
      )}
    </motion.div>
  );
}
