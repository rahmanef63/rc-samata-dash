import { internalMutation, mutation, MutationCtx } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getCallerRole(
  ctx: MutationCtx,
): Promise<"super_admin" | "owner" | "staff" | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const row = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return row?.role ?? "staff";
}

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

/**
 * Public — promote/demote a user's role.
 * Super-admin only. Cannot demote yourself (foot-gun guard).
 */
export const assignRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("owner"),
      v.literal("staff"),
    ),
  },
  handler: async (ctx, { userId, role }) => {
    const callerRole = await getCallerRole(ctx);
    if (callerRole !== "super_admin") {
      throw new Error("Forbidden: super_admin only");
    }
    const callerId = await getAuthUserId(ctx);
    if (String(callerId) === String(userId) && role !== "super_admin") {
      throw new Error("Cannot demote your own super_admin role");
    }
    const existing = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      if (existing.role !== role) await ctx.db.patch(existing._id, { role });
      return existing._id;
    }
    return await ctx.db.insert("userRoles", { userId, role });
  },
});
