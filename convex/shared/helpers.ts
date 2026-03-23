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

/**
 * Generate an item code like "PRD-001" or "ING-042".
 */
export function generateItemCode(prefix: "PRD" | "ING", sequence: number): string {
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Find the best matching item in a registry by name.
 * Returns the index of the best match, or -1 if no match found.
 *
 * Priority: exact normalized → alias match → substring includes.
 */
export function findBestMatch(
  name: string,
  registry: { normalizedName: string; aliases: string[] }[],
): number {
  const normalized = normalizeItemName(name);
  const noSpace = normalized.replace(/\s/g, "");

  // 1. Exact normalized match
  for (let i = 0; i < registry.length; i++) {
    if (registry[i].normalizedName === normalized) return i;
    if (registry[i].normalizedName.replace(/\s/g, "") === noSpace) return i;
  }

  // 2. Alias match
  for (let i = 0; i < registry.length; i++) {
    for (const alias of registry[i].aliases) {
      const na = normalizeItemName(alias);
      if (na === normalized) return i;
      if (na.replace(/\s/g, "") === noSpace) return i;
    }
  }

  // 3. Substring includes (bidirectional)
  for (let i = 0; i < registry.length; i++) {
    const rn = registry[i].normalizedName;
    if (rn.includes(normalized) || normalized.includes(rn)) return i;
  }

  return -1;
}

/**
 * Auto-categorize a product name for masterProducts.
 */
export function categorizeProduct(name: string): "ayam" | "minuman" | "snack" | "paket" | "sambal" | "lainnya" {
  const n = name.toUpperCase();
  if (n.includes("PAKET") || n.includes("PKT")) return "paket";
  if (n.includes("AYAM") || n.includes("PAHA") || n.includes("DADA") || n.includes("SAYAP") || n.includes("WING")) return "ayam";
  if (n.includes("SAMBAL") || n.includes("SAMBEL")) return "sambal";
  if (n.includes("ES ") || n.includes("TEH") || n.includes("KOPI") || n.includes("MILO") ||
      n.includes("LEMON") || n.includes("MINERAL") || n.includes("AQUA") || n.includes("FLOAT") ||
      n.includes("JUICE") || n.includes("JUS") || n.includes("CAPPUCINO") || n.includes("MATCHA")) return "minuman";
  if (n.includes("PERKEDEL") || n.includes("TAHU") || n.includes("TEMPE") || n.includes("RISOL") ||
      n.includes("KENTANG") || n.includes("NASI") || n.includes("KERUPUK") || n.includes("CRACKERS")) return "snack";
  return "lainnya";
}

/**
 * Auto-categorize an ingredient name for masterIngredients.
 */
export function categorizeIngredient(name: string): "protein" | "sayur" | "bumbu" | "minyak" | "kemasan" | "minuman_bahan" | "lainnya" {
  const n = name.toUpperCase();
  if (n.includes("AYAM") || n.includes("PAHA") || n.includes("DADA") || n.includes("SAYAP") ||
      n.includes("DAGING") || n.includes("TELUR") || n.includes("EGG")) return "protein";
  if (n.includes("MINYAK") || n.includes("OIL") || n.includes("GORENG")) return "minyak";
  if (n.includes("BUMBU") || n.includes("LADA") || n.includes("GARAM") || n.includes("BAWANG") ||
      n.includes("CABE") || n.includes("CABAI") || n.includes("MERICA") || n.includes("KETUMBAR") ||
      n.includes("KUNYIT") || n.includes("JAHE") || n.includes("LENGKUAS") || n.includes("SERAI") ||
      n.includes("SAMBAL") || n.includes("SAOS") || n.includes("KECAP") || n.includes("TEPUNG")) return "bumbu";
  if (n.includes("SAYUR") || n.includes("TIMUN") || n.includes("TOMAT") || n.includes("KUBIS") ||
      n.includes("SELADA") || n.includes("LALAPAN") || n.includes("MENTIMUN") || n.includes("KACANG")) return "sayur";
  if (n.includes("CUP") || n.includes("LID") || n.includes("SEDOTAN") || n.includes("STRAW") ||
      n.includes("PLASTIK") || n.includes("BOX") || n.includes("PAPER") || n.includes("KANTONG") ||
      n.includes("SENDOK") || n.includes("GARPU") || n.includes("TISSUE") || n.includes("TISU")) return "kemasan";
  if (n.includes("TEH") || n.includes("KOPI") || n.includes("GULA") || n.includes("SUSU") ||
      n.includes("CREAMER") || n.includes("SIRUP") || n.includes("COKLAT") || n.includes("MILO") ||
      n.includes("MATCHA") || n.includes("ES BATU") || n.includes("POWDER")) return "minuman_bahan";
  return "lainnya";
}
