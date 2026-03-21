export { formatRp } from "@/shared/lib";

import type { MonthlyRevenueData, BranchPerformanceData, DownloadableReport } from "../types";

export const monthlyData: MonthlyRevenueData[] = [
  { month: "JAN", value: 320000000 },
  { month: "FEB", value: 280000000 },
  { month: "MAR", value: 350000000 },
  { month: "APR", value: 310000000 },
  { month: "MAY", value: 420000000 },
  { month: "JUN", value: 450000000 },
];

export const expenseBreakdown = [
  { name: "Bahan Baku", value: 180000000, color: "hsl(346, 77%, 50%)" },
  { name: "Gaji & HR", value: 120000000, color: "hsl(217, 91%, 60%)" },
  { name: "Utilitas", value: 35000000, color: "hsl(38, 92%, 50%)" },
  { name: "Marketing", value: 22000000, color: "hsl(142, 71%, 45%)" },
  { name: "Lainnya", value: 15000000, color: "hsl(220, 9%, 46%)" },
];

export const cashflowWaterfallReport = [
  { name: "Revenue", value: 450000000 },
  { name: "COGS", value: -180000000 },
  { name: "Opex", value: -78000000 },
  { name: "Payroll", value: -120000000 },
  { name: "Tax", value: -18000000 },
  { name: "Net", value: 54000000 },
];

export const branches: BranchPerformanceData[] = [
  { name: "Jakarta Central", transactions: "2,451 Transactions", amount: "Rp 120M", percentage: 100 },
  { name: "Surabaya East", transactions: "1,822 Transactions", amount: "Rp 98M", percentage: 82 },
  { name: "Bandung South", transactions: "1,504 Transactions", amount: "Rp 75M", percentage: 63 },
];

export const reports: DownloadableReport[] = [
  { name: "Annual_Tax_Report_2023.pdf", date: "Oct 24, 2023", size: "2.4 MB" },
  { name: "Q3_Sales_Analysis.csv", date: "Oct 20, 2023", size: "1.1 MB" },
  { name: "Monthly_Summary_Oct.pdf", date: "Oct 15, 2023", size: "4.5 MB" },
];
