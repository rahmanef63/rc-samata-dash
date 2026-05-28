import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type Role = "super_admin" | "owner" | "staff";

/**
 * Require authentication for a public Convex function.
 * Supports queries, mutations, and actions.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: authentication required.");
  }
  return userId;
}

/**
 * Require the authenticated caller to hold one of `allowed` roles. Reads role
 * from `userRoles` (defaults to "staff" when no row). This is the backend
 * enforcement of what the sidebar already gates client-side — use on functions
 * whose surface is role-restricted in `src/config/routes.ts` so a direct API
 * call can't bypass the UI gate. Returns the userId. Needs db → queries /
 * mutations only (not actions).
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[],
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: authentication required.");
  }
  const row = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const role: Role = row?.role ?? "staff";
  if (!allowed.includes(role)) {
    throw new Error(`Forbidden: requires ${allowed.join(" or ")}.`);
  }
  return userId;
}
