import { defineTable } from "convex/server";
import { v } from "convex/values";
import { dailyReportKindValidator } from "./_types";

export const dailyReportValidationTables = {
  dailyReportValidations: defineTable({
    businessDate: v.string(),
    kind: dailyReportKindValidator,
    rawText: v.string(),
    parsedJson: v.string(),
    expectedJson: v.string(),
    diffJson: v.string(),
    matchedAll: v.boolean(),
    note: v.optional(v.string()),
    validatedBy: v.string(),
    validatedAt: v.number(),
  })
    .index("by_date", ["businessDate"])
    .index("by_kind", ["kind"]),
};
