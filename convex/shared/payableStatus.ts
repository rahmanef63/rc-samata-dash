/**
 * Status derivation for vendor payables.
 *
 * Two flavours because callsites need different semantics:
 *
 *  - `computePayableStatus(amount, paid, dueDate?)` — derive status
 *    from scratch (used by importers creating fresh payable rows).
 *
 *  - `applyPayment(amount, paid, current)` — recompute status after
 *    posting a payment. Returns "paid" / "partial" / fallback to the
 *    current status so we don't silently flip a manually-set
 *    "overdue" back to "open" while still accumulating partials.
 *
 * Centralising these formulas prevents the off-by-one bugs that
 * arise when one site uses `>=` and another `>`.
 */
import type { PayableStatus } from "./financeEnums";

export function computePayableStatus(
  amount: number,
  paid: number,
  dueDate?: string,
): PayableStatus {
  if (amount > 0 && paid >= amount) return "paid";
  if (paid > 0) return "partial";
  if (dueDate && Date.parse(dueDate) < Date.now()) return "overdue";
  return "open";
}

export function applyPayment(
  amount: number,
  paid: number,
  current: PayableStatus,
): PayableStatus {
  if (amount > 0 && paid >= amount) return "paid";
  if (paid > 0) return "partial";
  return current;
}
