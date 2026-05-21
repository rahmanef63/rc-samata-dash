/**
 * Cross-feature validators. Most enum validators have migrated to
 * their feature's `_types.ts` module (see e.g.
 * `convex/features/expenses/_types.ts`). This file keeps:
 *
 *  - back-compat re-exports of those validators so existing imports
 *    keep working;
 *  - genuinely cross-cutting validators that aren't tied to one
 *    feature (e.g. `etlSourceValidator`).
 */
import { v } from "convex/values";

// ─── Re-exports (sourced from per-feature _types) ──────────
export {
  expensePaymentSourceValidator as paymentSourceValidator,
  expenseStatusValidator as approvalStatusValidator,
} from "../features/expenses/_types";

export {
  vendorTypeValidator,
  incomeChannelTypeValidator,
  expenseCategoryTypeValidator,
} from "../features/masterData/_types";

export {
  stockStatusValidator,
  stockMovementTypeValidator,
} from "../features/inventory/_types";

export { pettyCashCategoryValidator } from "../features/pettyCash/_types";
export { auditActionValidator } from "../features/audit/_types";
export { paymentMethodValidator } from "./financeEnums";

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
