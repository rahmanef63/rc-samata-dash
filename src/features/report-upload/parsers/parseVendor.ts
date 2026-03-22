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

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const col2 = row[2];
    const col3 = String(row[3] ?? "").trim();

    if (!col3 && !col2) continue;

    // Detect section headers — they have text in col 3 but no number in col 2,
    // or text in col 1 as category label
    const col1Str = String(row[1] ?? "").toUpperCase().trim();
    const col3Upper = col3.toUpperCase();

    // Section header: text in col 3 with no item number, and it matches known sections
    // OR text spans multiple columns indicating a section
    const itemNum = toNumber(col2);
    const isSectionHeader = col3Upper && itemNum === 0 && !col3Upper.match(/^\d/) &&
      (col3Upper === "AYAM" || col3Upper.includes("PELENGKAP") || col3Upper.includes("BAHAN ES") ||
       col3Upper.includes("MINUMAN") || col3Upper.includes("MINYAK") || col3Upper.includes("BUMBU") ||
       col3Upper.includes("GROCERIES") || col3Upper.includes("PEMBUNGKUS") || col3Upper.includes("PEMBERSIH") ||
       col3Upper.includes("LAIN"));

    if (isSectionHeader) {
      currentSection = col3;
      continue;
    }

    // Also detect section from col 1 single letters that spell section names (A-Y-A-M etc.)
    // These appear as single chars: "A", "Y", "A", "M" in consecutive rows col 1
    // But they co-occur with item data in cols 2+, so just use them as section marker
    // if no item number is present

    // Item rows: must have a valid name in col 3
    if (!col3 || col3 === "0") continue;

    // Skip header-like text
    if (col3Upper.includes("KETERANGAN") || col3Upper === "NO" || col3Upper.includes("TOTAL")) continue;

    // Extract values
    const prevWeekValue = toNumber(row[colPrevWeekRp]);
    const prevWeekUnit = toNumber(row[colPrevWeekUnit]);
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
