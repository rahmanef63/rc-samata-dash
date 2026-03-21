import { defineTable } from "convex/server";
import { v } from "convex/values";

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
    status: v.union(
      v.literal("recorded"),
      v.literal("settled"),
      v.literal("pending_settlement")
    ),
    branchId: v.id("branches"),
  })
    .index("by_branch_date", ["branchId", "businessDate"])
    .index("by_status", ["status"]),
};
