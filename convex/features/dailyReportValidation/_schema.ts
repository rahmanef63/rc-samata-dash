import { defineTable } from "convex/server";
import { v } from "convex/values";
import { dailyReportKindValidator } from "./_types";

export const dailyReportValidationTables = {
  // Audit trail of WhatsApp daily report submissions that staff paste
  // into /laporan/validasi-harian. Each row captures the raw text, the
  // parsed values, what the system held for that businessDate at the
  // time of validation, the diff, and whether the user accepted the
  // variance (some rows flag known platform fees, refunds, etc).
  dailyReportValidations: defineTable({
    branchId: v.id("branches"),
    businessDate: v.string(),       // YYYY-MM-DD
    kind: dailyReportKindValidator,
    rawText: v.string(),
    parsedJson: v.string(),         // JSON.stringify of structured parse
    expectedJson: v.string(),       // JSON.stringify of system-side numbers
    diffJson: v.string(),           // JSON.stringify of computed diff
    matchedAll: v.boolean(),        // true = no diff (exact match)
    note: v.optional(v.string()),
    validatedBy: v.string(),
    validatedAt: v.number(),
  })
    .index("by_branch_date", ["branchId", "businessDate"])
    .index("by_branch_kind", ["branchId", "kind"]),
};
