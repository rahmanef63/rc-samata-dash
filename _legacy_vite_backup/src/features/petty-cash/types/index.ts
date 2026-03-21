import type { TransactionStatus } from "@/features/dashboard/types";

export interface PettyCashTransaction {
  title: string;
  status: TransactionStatus;
  amount: string;
  date: string;
}

export interface PettyCashSummary {
  totalPending: string;
  totalApproved: string;
}
