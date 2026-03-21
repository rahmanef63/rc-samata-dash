import { query } from "../../_generated/server";
import { v } from "convex/values";

export const listByBranch = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.query("auditLogs")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .take(200);
  },
});
