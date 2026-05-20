// SSOT for payable status — labels, colors, ordering.
// Mirrors convex/features/payables/_schema.ts:payables.status union.
//
// Why centralized: prior to 2026-05-21 each surface (PayablesOverview,
// vendor detail, owner-transfer filter chips) had its own copy of
// status → Indonesian label / color mapping, and at least one rendered
// the raw English enum to end users. Now there is exactly one place to
// add/rename/reorder a status.

export const PAYABLE_STATUSES = ["open", "partial", "paid", "overdue"] as const;
export type PayableStatus = (typeof PAYABLE_STATUSES)[number];

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, string> = {
  open: "Belum dibayar",
  partial: "Sebagian",
  paid: "Lunas",
  overdue: "Telat",
};

export const PAYABLE_STATUS_BADGE_CLS: Record<PayableStatus, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  partial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function isPayableStatus(value: string): value is PayableStatus {
  return (PAYABLE_STATUSES as readonly string[]).includes(value);
}
