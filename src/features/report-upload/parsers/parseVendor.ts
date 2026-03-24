/**
 * Parser sheet "VENDOR" (Pembelian & Stok Bahan Mingguan)
 *
 * Struktur (index 0-based):
 *   Row 4: Header row with dates at cols 8,10,12,14,16,18,20 (every 2 cols)
 *   Row 7: Sub-headers — Rp/Unit pairs
 *   Row 8+: Section headers (AYAM, PELENGKAP, BAHAN ES, MINUMAN, etc.) and item rows
 *
 *   Item rows have:
 *     Col 2: Item number
 *     Col 3: Item name (KETERANGAN BAHAN)
 *     Col 4: PEMAKAIAN MINGGU LALU (Rp)
 *     Col 5: PEMAKAIAN MINGGU LALU (Unit)
 *     Col 6: PERSEDIAAN AWAL (Rp)
 *     Col 7: PERSEDIAAN AWAL (Unit)
 *     Cols 8-21: Daily purchases (Rp/Unit pairs, 7 days)
 *     Col 34: TOTAL PEMBELIAN (Rp)
 *     Col 35: TOTAL PEMBELIAN (Unit)
 *     Col 36: PERSEDIAAN AKHIR (Rp)
 *     Col 37: PERSEDIAAN AKHIR (Unit)
 *     Col 38: PEMAKAIAN MINGGU INI (Rp)
 *     Col 39: PEMAKAIAN MINGGU INI (Unit)
 *
 * Parser scans ALL items, not just hardcoded commodities.
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type VendorPurchaseItem = {
  commodityName: string;
  section: string;
  openingQty: number;
  openingValue: number;
  purchaseQty: number;
  purchaseValue: number;
  usageQty: number;
  usageValue: number;
  closingQty: number;
  closingValue: number;
  prevWeekValue: number;
};

export function parseVendor(wb: XLSX.WorkBook): VendorPurchaseItem[] {
  const sheetName = wb.SheetNames.find((n) => n.toUpperCase() === "VENDOR");
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: VendorPurchaseItem[] = [];

  // Find the header area — detect column positions from rows 4-7
  // Key columns to detect: PEMAKAIAN MINGGU LALU, PERSEDIAAN AWAL, TOTAL PEMBELIAN, PERSEDIAAN AKHIR, PEMAKAIAN MINGGU INI
  let colPrevWeekRp = 4;
  let colPrevWeekUnit = 5;
  let colOpeningRp = 6;
  let colOpeningUnit = 7;
  let colTotalPurchaseRp = 34;
  let colTotalPurchaseUnit = 35;
  let colClosingRp = 36;
  let colClosingUnit = 37;
  let colUsageRp = 38;
  let colUsageUnit = 39;

  // Try to detect columns from header rows
  for (let i = 4; i <= 7; i++) {
    const row = rows[i] ?? [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "").toUpperCase().trim();
      if (cell.includes("PEMAKAIAN") && cell.includes("LALU")) { colPrevWeekRp = c; colPrevWeekUnit = c + 1; }
      if (cell.includes("PERSEDIAAN") && cell.includes("AWAL")) { colOpeningRp = c; colOpeningUnit = c + 1; }
      if (cell === "TOTAL" && i <= 5) {
        // Check context — row 4 or 5 with "TOTAL" + "PEMBELIAN" nearby
        const nextCells = row.slice(c, c + 3).map(v => String(v ?? "").toUpperCase());
        if (nextCells.some(nc => nc.includes("PEMBELIAN"))) {
          colTotalPurchaseRp = c;
          colTotalPurchaseUnit = c + 1;
        }
      }
      if (cell.includes("PERSEDIAAN") && cell.includes("AKHIR")) { colClosingRp = c; colClosingUnit = c + 1; }
      if (cell.includes("PEMAKAIAN") && cell.includes("INI")) { colUsageRp = c; colUsageUnit = c + 1; }
    }
  }

  let currentSection = "UMUM";
  const dataStartRow = 8; // First data/section row

  // Known section keywords for explicit detection
  const SECTION_KEYWORDS = [
    "AYAM", "PELENGKAP", "BAHAN ES", "MINUMAN", "MINYAK", "BUMBU",
    "GROCERIES", "PEMBUNGKUS", "PEMBERSIH", "LAIN", "MARINADE",
  ];

  // Track vertical-spelling accumulator for col1
  // VENDOR sheet spells section names vertically in col1: P-E-M-B-U-N-G-K-U-S
  let verticalLetters = "";
  let verticalStartRow = -1;

  function matchSection(text: string): string | null {
    const upper = text.toUpperCase().trim();
    for (const kw of SECTION_KEYWORDS) {
      if (upper.includes(kw)) return text.trim();
    }
    return null;
  }

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const col1Raw = String(row[1] ?? "").trim();
    const col2 = row[2];
    const col3 = String(row[3] ?? "").trim();
    const col1Upper = col1Raw.toUpperCase();
    const col3Upper = col3.toUpperCase();
    const itemNum = toNumber(col2);

    // ── Detect section from col1 (inline full word like "MINYAK") ──
    if (col1Upper && col1Upper.length > 2 && !col1Upper.includes("NB") && !col1Upper.includes("VENDOR")) {
      const sec = matchSection(col1Upper);
      if (sec) {
        currentSection = sec;
        // col1 section label may coexist with item data in cols 2+, so don't skip
      }
    }

    // ── Detect vertical spelling in col1 (single letters like P, E, M, B, ...) ──
    if (col1Upper.length === 1 && /^[A-Z]$/.test(col1Upper)) {
      if (verticalStartRow === -1 || i - verticalStartRow <= (verticalLetters.length + 1)) {
        if (verticalLetters === "") verticalStartRow = i;
        verticalLetters += col1Upper;
      } else {
        verticalLetters = col1Upper;
        verticalStartRow = i;
      }
      // Check if accumulated letters form a known section
      const sec = matchSection(verticalLetters);
      if (sec) {
        currentSection = verticalLetters;
        // Don't reset — more letters might come
      }
    } else if (col1Upper.length !== 1) {
      // Reset vertical accumulator when we see non-single-letter
      if (verticalLetters.length > 2) {
        const sec = matchSection(verticalLetters);
        if (sec) currentSection = verticalLetters;
      }
      verticalLetters = "";
      verticalStartRow = -1;
    }

    if (!col3 && !col2) continue;

    // ── Detect section from col3 (no item number) ──
    if (col3Upper && itemNum === 0 && !col3Upper.match(/^\d/)) {
      const sec = matchSection(col3Upper);
      if (sec) {
        currentSection = col3;
        continue;
      }
    }

    // Item rows: must have a valid name in col3
    if (!col3 || col3 === "0") continue;

    // Skip header-like text and totals
    if (col3Upper.includes("KETERANGAN") || col3Upper === "NO" ||
        col3Upper.startsWith("TOTAL") || col3Upper.includes("VENDOR REPORT") ||
        col3Upper.includes("BAHAN") && col3Upper.includes("HARI")) continue;

    // Extract values
    const prevWeekValue = toNumber(row[colPrevWeekRp]);
    const openingValue = toNumber(row[colOpeningRp]);
    const openingUnit = toNumber(row[colOpeningUnit]);
    const purchaseValue = toNumber(row[colTotalPurchaseRp]);
    const purchaseUnit = toNumber(row[colTotalPurchaseUnit]);
    const closingValue = toNumber(row[colClosingRp]);
    const closingUnit = toNumber(row[colClosingUnit]);
    const usageValue = toNumber(row[colUsageRp]);
    const usageUnit = toNumber(row[colUsageUnit]);

    // Skip rows with all zero values
    if (prevWeekValue === 0 && openingValue === 0 && purchaseValue === 0 &&
        closingValue === 0 && usageValue === 0) continue;

    result.push({
      commodityName: col3,
      section: currentSection,
      openingQty: openingUnit,
      openingValue,
      purchaseQty: purchaseUnit,
      purchaseValue,
      usageQty: usageUnit,
      usageValue,
      closingQty: closingUnit,
      closingValue,
      prevWeekValue,
    });
  }

  return result;
}
