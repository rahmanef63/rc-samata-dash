import type { TransactionStatus, Direction } from "@/shared/types";

export interface KpiData {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: "success" | "warning" | "destructive" | "primary";
  iconName: string;
}

export interface Transaction {
  id: string;
  name: string;
  type: string;
  amount: string;
  time: string;
  status: TransactionStatus;
  direction: Direction;
}

export interface PettyCashRequest {
  id: number;
  title: string;
  requester: string;
  amount: string;
  status: "pending" | "review" | "approved" | "rejected";
}

export interface SalesDataPoint {
  day: string;
  value: number;
}

export interface TransactionLogRow {
  id: string;
  outlet: string;
  category: string;
  amount: string;
  date: string;
  status: TransactionStatus;
}

export type { TransactionStatus, Direction };
