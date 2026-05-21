/**
 * Project-specific constants — the portability seam.
 *
 * Lifting any feature to another deployment? Override THIS file and
 * the rest of `convex/features/*` works unchanged. Anything that
 * encodes business semantics, locale, or seed data must live here
 * instead of being inlined inside feature mutations.
 *
 * Keep this file free of imports from `features/*` to avoid cycles —
 * it should sit at the root of the convex tree so any feature can
 * import it without dragging the world.
 */

// ─── Counterparty labels (human-readable strings on tx rows) ──
// Used by mirror/backfill flows that synthesise transactions from
// owner transfers and closing setoran. Other deployments may render
// these as "BOSS / PROPRIETOR / SHIFT CLOSE" etc.
export const PARTY = {
  OWNER: "OWNER",
  OWNER_INCOMING: "OWNER (incoming)",
  CASHIER_SETORAN: "(setoran kasir)",
} as const;

// ─── Match tolerances (Rupiah amounts) ──────────────────────
// Bank-statement auto-match treats amounts within ± this many IDR as
// equal (covers bank rounding, platform fee inclusion noise).
// Bump up only after running the validator log to see false matches.
export const MATCH = {
  /** ± IDR tolerance for amount comparison in auto-match. */
  TOLERANCE_RP: 1500,
} as const;

// ─── Master data seeds (RC Samata defaults) ─────────────────
// Used by reports/bridges.ts `seedMasterData()` to populate the
// expenseCategories + incomeChannels tables on a fresh deployment.
// Labels are Indonesian; other deployments swap these for their
// locale.
export const DEFAULT_EXPENSE_CATEGORIES: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
}[] = [
  { name: "Bahan Ayam", type: "cogs" },
  { name: "Bahan Pelengkap", type: "cogs" },
  { name: "Bahan Es", type: "cogs" },
  { name: "Bahan Minuman", type: "cogs" },
  { name: "Bahan Pembungkus", type: "cogs" },
  { name: "Minyak Goreng", type: "cogs" },
  { name: "Groceries/Bumbu", type: "cogs" },
  { name: "Pengeluaran Kas Kecil", type: "other" },
  { name: "Bahan Pembersih", type: "utility" },
  { name: "Transport", type: "utility" },
  { name: "Foto Copy/ATK", type: "other" },
  { name: "Lain-lain", type: "other" },
  { name: "BPJS", type: "bpjs" },
  { name: "Insentif / Gaji", type: "salary_support" },
  { name: "Maintenance", type: "maintenance" },
  { name: "Marketing", type: "marketing" },
  { name: "Platform Fee", type: "fee" },
];

export const DEFAULT_INCOME_CHANNELS: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
  isSettlementDelayed: boolean;
}[] = [
  { name: "Tunai (Cash)", type: "cash", isSettlementDelayed: false },
  { name: "Dine-in", type: "dine_in", isSettlementDelayed: false },
  { name: "Take Away", type: "take_away", isSettlementDelayed: false },
  { name: "Gofood", type: "gofood", isSettlementDelayed: true },
  { name: "Grabfood", type: "grabfood", isSettlementDelayed: true },
  { name: "Shopeefood", type: "shopeefood", isSettlementDelayed: true },
  { name: "Transfer Bank", type: "transfer", isSettlementDelayed: false },
];
