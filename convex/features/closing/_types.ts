/**
 * SSOT for closing-feature literal unions (dailyClosings, ownerTransfers,
 * paymentReceipts, bankStatementEntries, batches, aliases, logs).
 *
 * Cross-feature shared enums (PayableStatus, AnomalyFlag, PaidBy)
 * live in ../../shared/financeEnums and are re-exported from here so
 * downstream callers only need a single import per feature.
 */
import { v } from "convex/values";

export {
  ANOMALY_FLAGS, anomalyFlagValidator, type AnomalyFlag,
  PAID_BY, paidByValidator, type PaidBy,
} from "../../shared/financeEnums";

// ─── dailyClosings.status ─────────────────────────────────
export const CLOSING_STATUSES = ["open", "submitted", "verified"] as const;
export type ClosingStatus = typeof CLOSING_STATUSES[number];
export const closingStatusValidator = v.union(
  v.literal("open"),
  v.literal("submitted"),
  v.literal("verified"),
);

// ─── ownerTransfers.direction ─────────────────────────────
export const TRANSFER_DIRECTIONS = ["branch_to_owner", "owner_to_branch"] as const;
export type TransferDirection = typeof TRANSFER_DIRECTIONS[number];
export const transferDirectionValidator = v.union(
  v.literal("branch_to_owner"),
  v.literal("owner_to_branch"),
);

// ─── ownerTransfers.purpose ───────────────────────────────
export const TRANSFER_PURPOSES = [
  "night_transfer", "petty_cash_topup", "payable_payment_fund", "adjustment",
] as const;
export type TransferPurpose = typeof TRANSFER_PURPOSES[number];
export const transferPurposeValidator = v.union(
  v.literal("night_transfer"),
  v.literal("petty_cash_topup"),
  v.literal("payable_payment_fund"),
  v.literal("adjustment"),
);

// ─── ownerTransfers.status ────────────────────────────────
export const TRANSFER_STATUSES = ["pending", "completed"] as const;
export type TransferStatus = typeof TRANSFER_STATUSES[number];
export const transferStatusValidator = v.union(
  v.literal("pending"),
  v.literal("completed"),
);

// ─── bankStatementEntries.accountKind + batch.accountKind ─
export const ACCOUNT_KINDS = ["owner", "pic"] as const;
export type AccountKind = typeof ACCOUNT_KINDS[number];
export const accountKindValidator = v.union(v.literal("owner"), v.literal("pic"));

// ─── bankStatementEntries.category ────────────────────────
export const BANK_CATEGORIES = [
  "sales_inflow", "expense_outflow", "topup_pic",
  "payable_payment", "owner_capital", "transfer_internal", "other",
] as const;
export type BankCategory = typeof BANK_CATEGORIES[number];
export const bankCategoryValidator = v.union(
  v.literal("sales_inflow"),
  v.literal("expense_outflow"),
  v.literal("topup_pic"),
  v.literal("payable_payment"),
  v.literal("owner_capital"),
  v.literal("transfer_internal"),
  v.literal("other"),
);

// ─── vendorBankAliases.source ─────────────────────────────
export const ALIAS_SOURCES = ["validation", "manual", "statement"] as const;
export type AliasSource = typeof ALIAS_SOURCES[number];
export const aliasSourceValidator = v.union(
  v.literal("validation"),
  v.literal("manual"),
  v.literal("statement"),
);

// ─── validationLogs.entryType ─────────────────────────────
export const LOG_ENTRY_TYPES = ["bank_entry", "payable", "receipt"] as const;
export type LogEntryType = typeof LOG_ENTRY_TYPES[number];
export const logEntryTypeValidator = v.union(
  v.literal("bank_entry"),
  v.literal("payable"),
  v.literal("receipt"),
);

// ─── bankStatementBatches.status ──────────────────────────
export const BATCH_STATUSES = ["uploaded", "parsed", "reconciled"] as const;
export type BatchStatus = typeof BATCH_STATUSES[number];
export const batchStatusValidator = v.union(
  v.literal("uploaded"),
  v.literal("parsed"),
  v.literal("reconciled"),
);
