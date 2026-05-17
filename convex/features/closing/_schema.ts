import { defineTable } from "convex/server";
import { v } from "convex/values";

export const closingTables = {
  dailyClosings: defineTable({
    businessDate: v.string(),
    openingCash: v.number(),
    cashSales: v.number(),
    nonCashSales: v.number(),
    expensesPaidCash: v.number(),
    expectedCash: v.number(),
    actualCash: v.number(),
    difference: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("submitted"),
      v.literal("verified")
    ),
    submittedBy: v.string(),
    submittedAt: v.string(),
    branchId: v.id("branches"),
  }).index("by_branch_date", ["branchId", "businessDate"]),

  ownerTransfers: defineTable({
    closingId: v.optional(v.id("dailyClosings")),
    transferDate: v.string(),
    direction: v.union(
      v.literal("branch_to_owner"),
      v.literal("owner_to_branch")
    ),
    purpose: v.union(
      v.literal("night_transfer"),
      v.literal("petty_cash_topup"),
      v.literal("payable_payment_fund"),
      v.literal("adjustment")
    ),
    amount: v.number(),
    referenceNo: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    branchId: v.id("branches"),
    // ETL provenance — when row imported from a weekly report's
    // LAP. CF "Penerimaan lain-lain" section.
    reportId: v.optional(v.id("weeklyReports")),
    description: v.optional(v.string()),
  })
    .index("by_branch", ["branchId"])
    .index("by_report", ["reportId"]),
};
