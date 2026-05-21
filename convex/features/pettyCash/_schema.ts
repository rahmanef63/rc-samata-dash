import { defineTable } from "convex/server";
import { v } from "convex/values";
import { pettyCashCategoryValidator, pettyCashStatusValidator } from "./_types";

export const pettyCashTables = {
  pettyCashRequests: defineTable({
    requestDate: v.string(),
    requestedBy: v.string(),
    purposeCategory: pettyCashCategoryValidator,
    requestedAmount: v.number(),
    approvedAmount: v.number(),
    actualAmount: v.number(),
    status: pettyCashStatusValidator,
    notes: v.string(),
    hasAttachment: v.boolean(),
    branchId: v.id("branches"),
  })
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"]),
};
