/**
 * Pocket derivation — central rule for "which pocket did this cash
 * move from/to". Used by every mutation that creates a transaction
 * so cashflow stays synced (zero untagged tx by design).
 *
 * Priority order:
 *   1. explicit pocketSourceId from caller (form picker) — passthrough
 *   2. paymentSource hint (petty_cash → Petty Cash, owner_direct → Owner Direct, payable → Rek Toko)
 *   3. kind heuristic:
 *        - receipt / payment (in)   → Brankas Toko
 *        - expense (out)            → Brankas Toko (default cash-out)
 *        - transfer                 → Brankas Toko
 *        - payment (out, statement) → Rekening Toko
 *        - invoice                  → null (no cash movement)
 *   4. fallback if no pockets seeded → null (silent — caller can warn)
 *
 * Returns `{ pocketSourceId, pocketName }` or `{ pocketSourceId: undefined, pocketName: undefined }`.
 */
import type { MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

export type PocketHint = {
  explicit?: Id<"pockets">;
  kind?: string;          // "expense" | "receipt" | "payment" | "transfer" | "invoice" | "anomaly"
  direction?: string;     // "in" | "out" | "transfer"
  paymentSource?: string; // "petty_cash" | "owner_direct" | "payable" | etc.
  sourceKind?: string;    // "statement_bank" | "weekly_upload" | "manual" | etc.
};

type Resolved = { pocketSourceId?: Id<"pockets">; pocketName?: string };

export async function derivePocketSourceId(
  ctx: MutationCtx,
  hint: PocketHint,
): Promise<Resolved> {
  if (hint.explicit) {
    const p = await ctx.db.get(hint.explicit);
    if (p) return { pocketSourceId: hint.explicit, pocketName: p.name };
  }

  // Lookup by canonical names (kept in sync with seedDefaultPockets).
  const all = await ctx.db.query("pockets").take(50);
  if (all.length === 0) return {}; // no pockets seeded yet — bail silently

  const byName = new Map<string, typeof all[number]>();
  for (const p of all) byName.set(p.name, p);
  const find = (name: string) => byName.get(name);

  // Rule 1: paymentSource explicit mapping
  if (hint.paymentSource === "petty_cash") {
    const p = find("Petty Cash");
    if (p) return { pocketSourceId: p._id, pocketName: p.name };
  }
  if (hint.paymentSource === "owner_direct") {
    const p = find("Owner Direct");
    if (p) return { pocketSourceId: p._id, pocketName: p.name };
  }
  if (hint.paymentSource === "payable") {
    const p = find("Rekening Toko") ?? find("Brankas Toko");
    if (p) return { pocketSourceId: p._id, pocketName: p.name };
  }

  // Rule 2: invoice = expected future cash, not actual movement → null
  if (hint.kind === "invoice") return {};

  // Rule 3: payment via bank statement = bank pocket
  if (hint.kind === "payment" && hint.sourceKind === "statement_bank") {
    const p = find("Rekening Toko") ?? find("Brankas Toko");
    if (p) return { pocketSourceId: p._id, pocketName: p.name };
  }

  // Default cash-bucket = Brankas Toko (or first kind=brankas pocket)
  const brankas =
    find("Brankas Toko") ??
    all.find((p) => p.kind === "brankas") ??
    all.find((p) => p.isActive);
  if (brankas) return { pocketSourceId: brankas._id, pocketName: brankas.name };
  return {};
}
