import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

/** Internal — upsert role for a user. Called by seed action. */
export const setRole = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("owner"),
      v.literal("staff"),
    ),
  },
  handler: async (ctx, { userId, role }) => {
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      if (existing.role !== role) {
        await ctx.db.patch(existing._id, { role });
      }
      return existing._id;
    }
    return await ctx.db.insert("userRoles", { userId, role });
  },
});
