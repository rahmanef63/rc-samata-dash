export interface StockItem {
  name: string;
  quantity: string;
  status: "Stable" | "Low" | "Critical";
  percentage: number;
}

export interface InventoryHistoryEntry {
  title: string;
  time: string;
  amount: string;
  direction: "in" | "out";
}

export interface LowStockAlert {
  name: string;
  severity: "warning" | "critical";
  remaining: string;
  message: string;
}
