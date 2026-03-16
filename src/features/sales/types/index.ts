export interface SalesChannel {
  name: string;
  value: number;
}

export interface DailySalesEntry {
  date: string;
  channels: SalesChannel[];
  expectedCash: number;
}

export interface DepositEntry {
  id: string;
  amount: number;
  method: string;
  evidence?: string;
  confirmedByOwner: boolean;
  discrepancy: number;
  reason?: string;
}
