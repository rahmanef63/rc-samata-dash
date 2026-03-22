/**
 * Parser sheet "IKHTISAR FOOD COST" — ringkasan food cost per kategori bahan.
 *
 * Struktur (index 0-based):
 *   Baris berisi label di kolom 0 atau 1, nilai di kolom berikutnya.
 *   Kategori bahan (AYAM, ES, MINUMAN, dll) masing-masing punya:
 *     - Persediaan Awal (opening)
 *     - Pembelian (purchase)
 *     - Transfer Out / Transfer In
 *     - Persediaan Akhir (closing)
 *     - Pemakaian (usage) = opening + purchase - transferOut + transferIn - closing
 *     - Food Cost % = usage / sales revenue
 *
 * Parser mendeteksi baris berdasarkan label, bukan posisi tetap.
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type FoodCostSummaryItem = {
  category: string;
  openingValue: number;
  purchaseValue: number;
  transferOutValue: number;
  transferInValue: number;
  closingValue: number;
  usageValue: number;
  salesRevenue?: number;
  foodCostPct?: number;
};

export function parseIkhtisarFC(wb: XLSX.WorkBook): FoodCostSummaryItem[] {
  const sheetName = wb.SheetNames.find((n) => {
    const up = n.toUpperCase();
    return up.includes("IKHTISAR") && up.includes("FOOD COST");
  });
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: FoodCostSummaryItem[] = [];

  // Scan for category rows — typically structured as a summary table
  // Each category section has: category name, then value rows
  // Alternatively, it's a flat table with columns: Kategori, Opening, Purchase, TO, TI, Closing, Usage, FC%

  // Strategy: find header row first, then parse data rows
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    const cells = row.map((c) => String(c ?? "").toUpperCase().trim());
    // Look for column headers like PERSEDIAAN, PEMBELIAN, PEMAKAIAN, etc.
    const hasOpening = cells.some((c) => c.includes("AWAL") || c.includes("OPENING"));
    const hasPurchase = cells.some((c) => c.includes("BELI") || c.includes("PEMBELIAN") || c.includes("PURCHASE"));
    if (hasOpening || hasPurchase) {
      headerRowIdx = i;
      // Map column positions
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c];
        if (cell.includes("AWAL") || cell.includes("OPENING")) colMap.opening = c;
        else if (cell.includes("BELI") || cell.includes("PEMBELIAN") || cell.includes("PURCHASE")) colMap.purchase = c;
        else if (cell.includes("TRANSFER") && cell.includes("OUT")) colMap.transferOut = c;
        else if (cell.includes("TRANSFER") && cell.includes("IN")) colMap.transferIn = c;
        else if (cell.includes("AKHIR") || cell.includes("CLOSING")) colMap.closing = c;
        else if (cell.includes("PAKAI") || cell.includes("USAGE")) colMap.usage = c;
        else if (cell.includes("FC") || cell.includes("FOOD COST")) colMap.fcPct = c;
        else if (cell.includes("SALES") || cell.includes("PENJUALAN") || cell.includes("REVENUE")) colMap.sales = c;
      }
      break;
    }
  }

  // If we couldn't find headers, try parsing as label-value pairs
  if (headerRowIdx === -1) {
    return parseAsLabelValue(rows);
  }

  // Parse data rows after header
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row[0] ?? row[1] ?? "").trim();
    if (!label) continue;

    const upper = label.toUpperCase();
    if (upper.includes("TOTAL") || upper.includes("JUMLAH")) continue;
    // Skip sub-headers
    if (upper === "NO" || upper === "KETERANGAN" || upper === "KATEGORI") continue;

    const opening = toNumber(row[colMap.opening]);
    const purchase = toNumber(row[colMap.purchase]);
    const transferOut = toNumber(row[colMap.transferOut]);
    const transferIn = toNumber(row[colMap.transferIn]);
    const closing = toNumber(row[colMap.closing]);
    const usage = colMap.usage !== undefined
      ? toNumber(row[colMap.usage])
      : opening + purchase - transferOut + transferIn - closing;
    const sales = colMap.sales !== undefined ? toNumber(row[colMap.sales]) : undefined;
    const fcPct = colMap.fcPct !== undefined ? toNumber(row[colMap.fcPct]) : undefined;

    if (opening === 0 && purchase === 0 && closing === 0 && usage === 0) continue;

    result.push({
      category: label,
      openingValue: opening,
      purchaseValue: purchase,
      transferOutValue: transferOut,
      transferInValue: transferIn,
      closingValue: closing,
      usageValue: usage,
      salesRevenue: sales && sales > 0 ? sales : undefined,
      foodCostPct: fcPct && fcPct > 0 ? fcPct : undefined,
    });
  }

  return result;
}

/**
 * Fallback: parse as label-value pairs when no clear header row found.
 * Scans for known category names and extracts values from adjacent columns.
 */
function parseAsLabelValue(rows: (string | number | Date | null | boolean)[][]): FoodCostSummaryItem[] {
  const result: FoodCostSummaryItem[] = [];
  const KNOWN_CATEGORIES = [
    "BAHAN AYAM", "AYAM", "ES", "MINUMAN", "BAHAN PELENGKAP", "PELENGKAP",
    "MINYAK", "BUMBU", "GROCERIES", "PEMBUNGKUS", "PEMBERSIH", "LAIN-LAIN",
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row[0] ?? row[1] ?? "").toUpperCase().trim();
    const isCategory = KNOWN_CATEGORIES.some((k) => label.includes(k));
    if (!isCategory) continue;

    // Try to extract values from columns 2+
    const values = row.slice(2).map((v) => toNumber(v));
    if (values.every((v) => v === 0)) continue;

    result.push({
      category: String(row[0] ?? row[1] ?? "").trim(),
      openingValue: values[0] ?? 0,
      purchaseValue: values[1] ?? 0,
      transferOutValue: values[2] ?? 0,
      transferInValue: values[3] ?? 0,
      closingValue: values[4] ?? 0,
      usageValue: values[5] ?? (values[0] + values[1] - (values[2] ?? 0) + (values[3] ?? 0) - (values[4] ?? 0)),
      salesRevenue: values[6] && values[6] > 0 ? values[6] : undefined,
      foodCostPct: values[7] && values[7] > 0 ? values[7] : undefined,
    });
  }

  return result;
}
