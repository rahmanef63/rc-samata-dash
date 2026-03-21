/**
 * Shared utility helpers for Convex functions.
 */
import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Insert an audit log entry. Call from any mutation.
 */
export async function insertAuditLog(
  ctx: MutationCtx,
  args: {
    entityType: string;
    entityId: string;
    action: "create" | "update" | "delete" | "approve" | "reject" | "pay";
    description: string;
    actedBy: string;
    branchId: Id<"branches">;
  }
) {
  await ctx.db.insert("auditLogs", {
    ...args,
    actedAt: new Date().toISOString(),
  });
}

/**
 * Get today's date in YYYY-MM-DD format (Asia/Jakarta timezone).
 */
export function todayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
