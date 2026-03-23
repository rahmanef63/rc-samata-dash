import { defineTable } from "convex/server";
import { v } from "convex/values";
import { pettyCashCategoryValidator } from "../../shared/validators";

export const pettyCashTables = {
  pettyCashRequests: defineTable({
    requestDate: v.string(),
    requestedBy: v.string(),
    purposeCategory: pettyCashCategoryValidator,
    requestedAmount: v.number(),
    approvedAmount: v.number(),
    actualAmount: v.number(),
    status: v.union(
      v.literal("requested"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("disbursed"),
      v.literal("closed")
    ),
    notes: v.string(),
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
  })
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"]),
};
