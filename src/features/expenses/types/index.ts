import { LucideIcon } from "lucide-react";

export interface ExpenseCategory {
  label: string;
  amount: string;
  percentage: number;
}

export interface RecentExpense {
  title: string;
  time: string;
  amount: string;
  iconName: string;
  badge: string;
  badgeColor: string;
}
