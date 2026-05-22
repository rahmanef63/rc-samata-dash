import { defineTable } from "convex/server";
import { v } from "convex/values";
import { etlSourceValidator } from "../../shared/validators";
import { salesStatusValidator } from "./_types";

export const salesTables = {
  dailySales: defineTable({
    businessDate: v.string(),
    channelId: v.id("incomeChannels"),
    channelName: v.string(),
    grossAmount: v.number(),
    platformFee: v.number(),
    promoCost: v.number(),
    netAmount: v.number(),
    cashReceivedAmount: v.number(),
    settlementDate: v.optional(v.string()),
    referenceNo: v.string(),
    status: salesStatusValidator,
    branchId: v.id("branches"),
    etlSource: etlSourceValidator,
    sourceReportId: v.optional(v.id("weeklyReports")),
    // Bridge FK ke Buku Besar (transactions). Cascade delete via field ini.
    transactionId: v.optional(v.id("transactions")),
  })
    .index("by_branch_date", ["branchId", "businessDate"])
    .index("by_status", ["status"])
    .index("by_source_report", ["sourceReportId"])
    .index("by_transaction", ["transactionId"]),
};
