import { defineTable } from "convex/server";
import { v } from "convex/values";

export const auditTables = {
  auditLogs: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("approve"),
      v.literal("reject"),
      v.literal("pay")
    ),
    description: v.string(),
    actedBy: v.string(),
    actedAt: v.string(),
    branchId: v.id("branches"),
  }).index("by_branch", ["branchId"]),
};
