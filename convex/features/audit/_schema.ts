import { defineTable } from "convex/server";
import { v } from "convex/values";
import { auditActionValidator } from "./_types";

export const auditTables = {
  auditLogs: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: auditActionValidator,
    description: v.string(),
    actedBy: v.string(),
    actedAt: v.string(),
    branchId: v.optional(v.id("branches")),
  }).index("by_branch", ["branchId"]),
};
