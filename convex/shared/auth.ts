import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
