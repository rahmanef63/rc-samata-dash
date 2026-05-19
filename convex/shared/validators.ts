/**
 * Shared validators used across multiple feature schemas.
 * SSOT for common enum types and reusable field definitions.
 */
import { v } from "convex/values";

// ─── Common Status Validators ───────────────────────────────
export const paymentSourceValidator = v.union(
  v.literal("owner_direct"),
  v.literal("petty_cash"),
  v.literal("payable")
);

export const approvalStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("approved"),
  v.literal("paid"),
  v.literal("rejected")
);

export const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("transfer")
);

// ─── Vendor Type ────────────────────────────────────────────
export const vendorTypeValidator = v.union(
  v.literal("food_supplier"),
  v.literal("utility"),
  v.literal("service"),
  v.literal("payroll"),
  v.literal("misc")
);

// ─── Income Channel Type ────────────────────────────────────
export const incomeChannelTypeValidator = v.union(
  v.literal("cash"),
  v.literal("transfer"),
  v.literal("gofood"),
  v.literal("grabfood"),
  v.literal("shopeefood"),
  v.literal("dine_in"),
  v.literal("take_away"),
  v.literal("other")
);

// ─── Expense Category Type ──────────────────────────────────
export const expenseCategoryTypeValidator = v.union(
  v.literal("cogs"),
  v.literal("utility"),
  v.literal("salary_support"),
  v.literal("bpjs"),
  v.literal("maintenance"),
  v.literal("marketing"),
  v.literal("fee"),
  v.literal("other")
);

// ─── Stock Status ───────────────────────────────────────────
export const stockStatusValidator = v.union(
  v.literal("Stable"),
  v.literal("Low"),
  v.literal("Critical")
);

export const stockMovementTypeValidator = v.union(
  v.literal("stock_in"),
  v.literal("usage"),
  v.literal("adjustment"),
  v.literal("waste")
);

// ─── Petty Cash Category ────────────────────────────────────
export const pettyCashCategoryValidator = v.union(
  v.literal("Utilitas"),
  v.literal("Bahan Baku"),
  v.literal("Maintenance"),
  v.literal("Transfer Owner"),
  v.literal("Lain-lain")
);

// ─── Audit Action ───────────────────────────────────────────
export const auditActionValidator = v.union(
  v.literal("create"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("approve"),
  v.literal("reject"),
  v.literal("pay")
);

// ─── ETL Source Provenance ──────────────────────────────────
/**
 * Optional metadata stamped on CRUD rows that were bridged from
 * weeklyReports staging tables. Lets the UI's RowSourceDialog show
 * "this row came from sheet X, tab Y, row N of the original report"
 * and deep-link to /laporan/{reportId}?tab=&row=.
 */
export const etlSourceValidator = v.optional(
  v.object({
    reportId: v.id("weeklyReports"),
    stagingTable: v.string(),  // e.g. "dailyCashFlow"
    tabLabel: v.string(),      // human label, e.g. "Arus Kas"
    rowIndex: v.number(),      // 0-based row position within tab
    sheetName: v.optional(v.string()),   // original xlsx sheet
    fileName: v.optional(v.string()),    // denormalized from weeklyReports
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
  })
);
