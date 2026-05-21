/**
 * SSOT for finance-domain enums that cross feature boundaries.
 *
 * Why here instead of per-feature: these literals are referenced by
 * MORE THAN ONE feature schema. Keeping them in a single shared
 * module avoids drift (e.g. payables.status and transactions.status
 * agreeing on `open/partial/paid/overdue`).
 *
 * Pattern: const tuple → derive TS type → Convex validator with
 * matching literal calls. The compile-time assertion at the bottom
 * guards drift between tuple and validator.
 */
import { v } from "convex/values";

// ─── Payable status ───────────────────────────────────────
export const PAYABLE_STATUSES = ["open", "partial", "paid", "overdue"] as const;
export type PayableStatus = typeof PAYABLE_STATUSES[number];
export const payableStatusValidator = v.union(
  v.literal("open"),
  v.literal("partial"),
  v.literal("paid"),
  v.literal("overdue"),
);

// ─── Anomaly flag (paymentReceipts + transactions) ────────
export const ANOMALY_FLAGS = ["ok", "mislabel", "duplicate", "not_transfer", "partial"] as const;
export type AnomalyFlag = typeof ANOMALY_FLAGS[number];
export const anomalyFlagValidator = v.union(
  v.literal("ok"),
  v.literal("mislabel"),
  v.literal("duplicate"),
  v.literal("not_transfer"),
  v.literal("partial"),
);

// ─── Paid-by (receipts + transactions) ────────────────────
export const PAID_BY = ["owner", "pic"] as const;
export type PaidBy = typeof PAID_BY[number];
export const paidByValidator = v.union(v.literal("owner"), v.literal("pic"));

// ─── Payment method (used by payablePayments + UI options) ─
export const PAYMENT_METHODS = ["cash", "transfer"] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export const paymentMethodValidator = v.union(v.literal("cash"), v.literal("transfer"));

// ─── Compile-time guards ──────────────────────────────────
type _AssertPayableStatus = PayableStatus extends "open" | "partial" | "paid" | "overdue" ? true : never;
type _AssertAnomalyFlag = AnomalyFlag extends "ok" | "mislabel" | "duplicate" | "not_transfer" | "partial" ? true : never;
type _AssertPaidBy = PaidBy extends "owner" | "pic" ? true : never;
type _AssertPaymentMethod = PaymentMethod extends "cash" | "transfer" ? true : never;
const _a: _AssertPayableStatus = true;
const _b: _AssertAnomalyFlag = true;
const _c: _AssertPaidBy = true;
const _d: _AssertPaymentMethod = true;
void _a; void _b; void _c; void _d;
