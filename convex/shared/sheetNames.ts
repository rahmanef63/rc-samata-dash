/**
 * SSOT for xlsx / CSV sheet identifiers used across parsers + ETL
 * bridges. Backend code MUST import these constants rather than
 * inlining the string literal — a typo in `"LAP. CF"` vs `"LAP.CF"`
 * silently breaks the bridge.
 *
 * The values are the literal sheet titles as written by the upstream
 * report producer. Change here = single update.
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

export type SheetKey = keyof typeof SHEET;
export type SheetName = typeof SHEET[SheetKey];

/** Channel slug → sheet name for sales bridges. */
export const SHEET_BY_CHANNEL: Record<string, SheetName> = {
  all: SHEET.LAP_PENJUALAN,
  gofood: SHEET.LAP_PENJUALAN_GOFOOD,
  grabfood: SHEET.LAP_PENJUALAN_GRABFOOD,
  shopeefood: SHEET.LAP_PENJUALAN_SHOPEEFOOD,
  tambahan: SHEET.LAP_PENJUALAN,
};

/** CSV import sheet tags (laporanPic flow — TRANSAKSI = long, MATCH_PIUTANG = pivot). */
export const CSV_SHEET = {
  TRANSAKSI: "TRANSAKSI",
  MATCH_PIUTANG: "MATCH_PIUTANG",
} as const;
