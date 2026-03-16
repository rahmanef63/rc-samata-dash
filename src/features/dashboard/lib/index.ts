import type { Transaction, PettyCashRequest, SalesDataPoint, TransactionLogRow } from "../types";
export { containerVariants, itemVariants } from "@/shared/constants";
export { formatRp } from "@/shared/lib";

export const salesData: SalesDataPoint[] = [
  { day: "Mon", value: 14500000 },
  { day: "Tue", value: 16200000 },
  { day: "Wed", value: 15800000 },
  { day: "Thu", value: 18500000 },
  { day: "Fri", value: 21000000 },
  { day: "Sat", value: 24500000 },
  { day: "Sun", value: 22800000 },
];

// 30-day sales data for line chart
export const sales30Days: SalesDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  value: Math.round(12000000 + Math.random() * 14000000 + Math.sin(i / 3) * 5000000),
}));

// Expense breakdown by category
export const expenseByCategory = [
  { name: "Bahan Baku", value: 28000000, color: "hsl(346, 77%, 50%)" },
  { name: "Gaji Staff", value: 18000000, color: "hsl(217, 91%, 60%)" },
  { name: "Listrik & Air", value: 5200000, color: "hsl(38, 92%, 50%)" },
  { name: "Marketing", value: 3500000, color: "hsl(142, 71%, 45%)" },
  { name: "Lainnya", value: 2200000, color: "hsl(220, 9%, 46%)" },
];

// Cashflow waterfall data
export const cashflowWaterfall = [
  { name: "Revenue", value: 52000000 },
  { name: "COGS", value: -28000000 },
  { name: "Opex", value: -8500000 },
  { name: "Payroll", value: -7200000 },
  { name: "Tax", value: -2100000 },
  { name: "Net", value: 6200000 },
];

export const recentTransactions: Transaction[] = [
  { id: "#TXN-88219", name: "Outlet Ahmad - Samata", type: "Sales Deposit", amount: "+Rp 4.250.000", time: "12:30 PM", status: "completed", direction: "in" },
  { id: "#TXN-88218", name: "Petty Cash: Galon Air", type: "Expense", amount: "-Rp 150.000", time: "11:15 AM", status: "approved", direction: "out" },
  { id: "#TXN-88217", name: "Outlet Diponegoro", type: "Sales Deposit", amount: "+Rp 3.800.000", time: "09:40 AM", status: "completed", direction: "in" },
  { id: "#TXN-88216", name: "Inventory Stock-in", type: "Logistics", amount: "Rp 12.000.000", time: "Yesterday", status: "pending", direction: "out" },
];

export const pettyCashRequests: PettyCashRequest[] = [
  { id: 1, title: "Stok Bahan Baku - Emergency", requester: "Manager Sudirman", amount: "Rp 450.000", status: "pending" },
  { id: 2, title: "PLN Prepaid Token", requester: "Requested 2h ago", amount: "Rp 200.000", status: "review" },
];

export const transactionLogRows: TransactionLogRow[] = [
  { id: "#TXN-88219", outlet: "Rocket Chicken - Sleman", category: "Sales Setoran", amount: "+ Rp 5,240,000", date: "23 Oct 2023, 10:20", status: "completed" },
  { id: "#TXN-88218", outlet: "Petty Cash Req: Office", category: "Petty Cash", amount: "- Rp 320,000", date: "23 Oct 2023, 09:15", status: "approved" },
  { id: "#TXN-88217", outlet: "GoFood Settlement", category: "Mitra Income", amount: "+ Rp 1,120,000", date: "22 Oct 2023, 16:00", status: "settled" },
];
