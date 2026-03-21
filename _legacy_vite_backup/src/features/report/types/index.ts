export interface MonthlyRevenueData {
  month: string;
  value: number;
}

export interface BranchPerformanceData {
  name: string;
  transactions: string;
  amount: string;
  percentage: number;
}

export interface DownloadableReport {
  name: string;
  date: string;
  size: string;
}
