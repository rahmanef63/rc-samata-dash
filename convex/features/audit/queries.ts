import { query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";

/**
 * List audit logs. Optionally filter by entity (entityType + entityId).
 * Otherwise returns the 200 most recent across all entities.
 * Name preserved (`listByBranch`) so the frontend cascade still resolves
 * during the single-tenant migration; args are now empty.
 */
export const listByBranch = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.entityType && args.entityId) {
      return await ctx.db.query("auditLogs")
        .withIndex("by_entity", (q) => q.eq("entityType", args.entityType!).eq("entityId", args.entityId!))
        .order("desc")
        .take(200);
    }
    return await ctx.db.query("auditLogs")
      .withIndex("by_actedAt")
      .order("desc")
      .take(200);
  },
});
