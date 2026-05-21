/**
 * Frontend mirror of `convex/shared/sheetNames.ts`. Kept as a separate
 * file because FE imports must not reach into the convex/ tree.
 *
 * KEEP IN SYNC with the backend constants — values are the literal
 * sheet titles parsers / bridges expect.
 */

export const SHEET = {
  LAP_CF: "LAP. CF",
  LAP_PENJUALAN: "LAP. PENJUALAN",
  LAP_PENJUALAN_GOFOOD: "LAP. PENJUALAN GRAB FOOD",
  LAP_PENJUALAN_GRABFOOD: "LAP. PENJUALAN GRAB FOOD",
  LAP_PENJUALAN_SHOPEEFOOD: "LAP. PENJUALAN SHOPEE FOOD",
  PEMBELIAN_KREDIT: "PEMBELIAN KREDIT",
  WEEKLY_FC: "WEEKLY FC",
  COST_ANALYSIS: "COST ANALYSIS",
} as const;

export const CSV_SHEET = {
  TRANSAKSI: "TRANSAKSI",
  MATCH_PIUTANG: "MATCH_PIUTANG",
} as const;
