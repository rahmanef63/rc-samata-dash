import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { auditActionValidator } from "../../shared/validators";

export const create = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: auditActionValidator,
    description: v.string(),
    actedBy: v.string(),
    actedAt: v.string(),
    branchId: v.id("branches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});
