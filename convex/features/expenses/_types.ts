/**
 * Expenses feature types — payment source + approval workflow status.
 */
import { v } from "convex/values";

export const EXPENSE_PAYMENT_SOURCES = ["owner_direct", "petty_cash", "payable"] as const;
export type ExpensePaymentSource = typeof EXPENSE_PAYMENT_SOURCES[number];
export const expensePaymentSourceValidator = v.union(
  v.literal("owner_direct"),
  v.literal("petty_cash"),
  v.literal("payable"),
);

export const EXPENSE_STATUSES = ["draft", "submitted", "approved", "paid", "rejected"] as const;
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];
export const expenseStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("paid"),
  v.literal("rejected"),
);
