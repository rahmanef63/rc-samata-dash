export interface LedgerEntry {
  title: string;
  time: string;
  amount: string;
  status: string;
  color: string;
}

export interface CashflowDataPoint {
  day: string;
  value: number;
}
