import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeader, DataTable, CrudDialog, TabBar } from "@/shared/components";
import type { FieldConfig, Column } from "@/shared/components";
import { useCrudState, useTableState } from "@/shared/hooks";
import type { StockItem, StockMovement } from "@/shared/types";
import { stockItems, stockMovements, movementTypeLabels } from "../lib";

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

const subTabs = ["Stock Items", "Movements"] as const;
type SubTab = typeof subTabs[number];

export function InventoryOverview() {
  const [activeTab, setActiveTab] = useState<SubTab>("Stock Items");

  const itemCrud = useCrudState<StockItem>(stockItems);
  const itemTable = useTableState(itemCrud.items, ["name", "status"]);

  const moveCrud = useCrudState<StockMovement>(stockMovements);
  const moveTable = useTableState(moveCrud.items, ["itemName", "type", "notes"]);

  const lowStockItems = itemCrud.items.filter(i => i.status === "Low" || i.status === "Critical");
  const totalWaste = moveCrud.items.filter(m => m.type === "waste").reduce((s, m) => s + m.qty, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <TabBar<SubTab> tabs={subTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Stock Items" && (
        <>
          {/* Low Stock Alert */}
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

          <SectionHeader title="Daftar Stok" />
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
          <CrudDialog<StockItem>
            open={itemCrud.isOpen} mode={itemCrud.mode} item={itemCrud.selectedItem}
            fields={itemFields} entityName="Item Stok" onClose={itemCrud.close}
            onSubmit={itemCrud.mode === "edit" ? itemCrud.onUpdate : itemCrud.onCreate}
            onDelete={itemCrud.onDelete}
          />
        </>
      )}

      {activeTab === "Movements" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">TOTAL WASTE</p>
              <p className="text-lg font-bold font-mono-data text-destructive">{totalWaste} unit</p>
            </div>
            <div className="bg-card rounded-xl shadow-card p-3">
              <p className="label-uppercase mb-1">MOVEMENTS HARI INI</p>
              <p className="text-lg font-bold font-mono-data">{moveCrud.items.filter(m => m.date === "2024-05-24").length}</p>
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
