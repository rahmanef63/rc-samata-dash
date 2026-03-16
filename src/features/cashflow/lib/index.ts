import type { LedgerEntry, CashflowDataPoint } from "../types";

export const cashflowData: CashflowDataPoint[] = [
  { day: "M", value: 32000000 },
  { day: "T", value: 38000000 },
  { day: "W", value: 35000000 },
  { day: "T", value: 42000000 },
  { day: "F", value: 45000000 },
  { day: "S", value: 48000000 },
  { day: "S", value: 44000000 },
];

export const recentLedger: LedgerEntry[] = [
  { title: "Outlet Daily Deposit", time: "Today, 08:30 PM", amount: "+Rp 4.250k", status: "Success", color: "text-success" },
  { title: "Electricity Bill Payment", time: "Yesterday, 10:15 AM", amount: "-Rp 1.200k", status: "Success", color: "text-destructive" },
  { title: "Petty Cash Refill", time: "22 Oct, 02:45 PM", amount: "Rp 500k", status: "Pending", color: "text-foreground" },
  { title: "Weekly Sales Settlement", time: "21 Oct, 11:00 AM", amount: "+Rp 12.800k", status: "Success", color: "text-success" },
];
