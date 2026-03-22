import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Require authentication. Throws if not authenticated.
 * Returns the authenticated userId string.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: authentication required.");
  }
  return userId;
}
