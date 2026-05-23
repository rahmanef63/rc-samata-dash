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
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_actedAt", ["actedAt"]),
};
