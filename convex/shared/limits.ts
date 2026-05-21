/**
 * Pagination limits for Convex `.take(N)` calls.
 *
 * Convention: every query that fans out over a large table must
 * `.withIndex(...).take(LIMITS.X)`. Naming the bound makes it grep-able
 * and lets us bump page sizes from a single edit when the dataset
 * grows.
 *
 * Values chosen to comfortably fit a single Convex query's row cap
 * (16 MB) while still covering ~3–5 years of typical operational data
 * for one branch.
 */
export const LIMITS = {
  /** Vendor master — typically dozens. */
  VENDORS_PAGE: 2000,
  /** Expense categories master. */
  CATEGORIES_PAGE: 2000,
  /** Income channels master. */
  CHANNELS_PAGE: 2000,
  /** Branches master. */
  BRANCHES_PAGE: 200,

  /** Payables list per branch. */
  PAYABLES_PAGE: 5000,
  /** Payable payments. */
  PAYMENTS_PAGE: 5000,
  /** Receipts (proofs). */
  RECEIPTS_PAGE: 5000,
  /** Transactions (SSOT) per branch. */
  TX_PAGE: 5000,
  /** Bank statement entries. */
  BANK_ENTRIES_PAGE: 5000,
  /** Owner transfers. */
  OWNER_TRANSFERS_PAGE: 5000,
  /** Daily closings. */
  CLOSINGS_PAGE: 5000,
  /** Expenses. */
  EXPENSES_PAGE: 5000,
  /** Sales (per branch+date). */
  SALES_PAGE: 5000,

  /** Weekly reports — 52 covers one year. */
  REPORTS_PAGE: 52,

  /** Staging tables under a weekly report. */
  STAGING_PAGE: 8000,

  /** Vendor bank aliases. */
  ALIASES_PAGE: 2000,

  /** Audit log scan. */
  AUDIT_PAGE: 5000,

  /** Inventory items. */
  INVENTORY_PAGE: 2000,
  /** Stock movements. */
  STOCK_MOVEMENTS_PAGE: 5000,

  /** Wide-fan scan for backfill / one-shot ETL passes. */
  BACKFILL_BATCH: 20000,
} as const;
