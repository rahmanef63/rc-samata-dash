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
    branchId?: Id<"branches">;
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

/**
 * Normalize item name for cross-table matching.
 * Strips common prefixes, uppercases, and trims.
 */
export function normalizeItemName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/^(DAGING\s+|BAHAN\s+|BUMBU\s+)/i, "")
    .replace(/\s+/g, " ");
}

/**
 * Check if two item names match (fuzzy bidirectional includes).
 */
export function matchItemNames(a: string, b: string): boolean {
  const na = normalizeItemName(a);
  const nb = normalizeItemName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Juga cek tanpa spasi untuk kasus "PAHA ATAS" vs "PAHAATAS"
  const naNoSpace = na.replace(/\s/g, "");
  const nbNoSpace = nb.replace(/\s/g, "");
  return naNoSpace === nbNoSpace;
}
