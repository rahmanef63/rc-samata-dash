import { query, internalQuery, QueryCtx } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getCallerRole(
  ctx: QueryCtx,
): Promise<"super_admin" | "owner" | "staff" | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const row = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return row?.role ?? "staff";
}

/**
 * Returns the current user's role. Defaults to "staff" for any authenticated
 * user without an explicit `userRoles` row. Returns null if not signed in.
 */
export const myRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row?.role ?? "staff";
  },
});

/** Internal — used by seed action to detect existing accounts. */
export const findUserByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    return user?._id ?? null;
  },
});

/**
 * List all users with their roles — super_admin only.
 * Bounded by .take(500) since user count stays tiny for QSR ops.
 */
export const listUsersWithRoles = query({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    if (role !== "super_admin") {
      throw new Error("Forbidden: super_admin only");
    }
    const users = await ctx.db.query("users").take(500);
    const roles = await ctx.db.query("userRoles").take(500);
    const roleByUser = new Map(roles.map((r) => [String(r.userId), r.role]));
    return users.map((u) => ({
      _id: u._id,
      email: u.email ?? null,
      name: u.name ?? null,
      image: u.image ?? null,
      role: (roleByUser.get(String(u._id)) ?? "staff") as
        | "super_admin"
        | "owner"
        | "staff",
    }));
  },
});
