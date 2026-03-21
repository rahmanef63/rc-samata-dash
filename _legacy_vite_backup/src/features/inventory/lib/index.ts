import type { StockItem, StockMovement } from "@/shared/types";

export const stockItems: StockItem[] = [
  { id: "stk-1", name: "Ayam Potong", currentQty: 45, unit: "kg", minQty: 20, status: "Stable" },
  { id: "stk-2", name: "Tepung Terigu", currentQty: 12, unit: "kg", minQty: 15, status: "Low" },
  { id: "stk-3", name: "Minyak Goreng", currentQty: 18, unit: "liter", minQty: 10, status: "Stable" },
  { id: "stk-4", name: "Beras", currentQty: 30, unit: "kg", minQty: 25, status: "Stable" },
  { id: "stk-5", name: "Gas Elpiji", currentQty: 2, unit: "tabung", minQty: 3, status: "Critical" },
  { id: "stk-6", name: "Bumbu Racik", currentQty: 8, unit: "kg", minQty: 5, status: "Stable" },
  { id: "stk-7", name: "Sambal", currentQty: 5, unit: "kg", minQty: 3, status: "Stable" },
  { id: "stk-8", name: "Sayur Lalapan", currentQty: 3, unit: "kg", minQty: 5, status: "Low" },
];

export const stockMovements: StockMovement[] = [
  { id: "sm-1", itemId: "stk-1", itemName: "Ayam Potong", type: "stock_in", qty: 50, unit: "kg", date: "2024-05-24", notes: "Purchase dari CV Bahan Pokok" },
  { id: "sm-2", itemId: "stk-1", itemName: "Ayam Potong", type: "usage", qty: 25, unit: "kg", date: "2024-05-24", notes: "Produksi harian" },
  { id: "sm-3", itemId: "stk-2", itemName: "Tepung Terigu", type: "usage", qty: 8, unit: "kg", date: "2024-05-24", notes: "Produksi" },
  { id: "sm-4", itemId: "stk-5", itemName: "Gas Elpiji", type: "usage", qty: 1, unit: "tabung", date: "2024-05-24", notes: "Dapur" },
  { id: "sm-5", itemId: "stk-3", itemName: "Minyak Goreng", type: "stock_in", qty: 20, unit: "liter", date: "2024-05-23", notes: "Restock" },
  { id: "sm-6", itemId: "stk-1", itemName: "Ayam Potong", type: "waste", qty: 2, unit: "kg", date: "2024-05-23", notes: "Expired / busuk" },
  { id: "sm-7", itemId: "stk-4", itemName: "Beras", type: "adjustment", qty: -3, unit: "kg", date: "2024-05-22", notes: "Selisih stock opname" },
];

export const movementTypeLabels: Record<string, string> = {
  stock_in: "Stock In",
  usage: "Pemakaian",
  adjustment: "Adjustment",
  waste: "Waste / Spoilage",
};
