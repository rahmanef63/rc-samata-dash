/**
 * Parser sheet platform sales: LAP. PENJUALAN GRAB FOOD, GO FOOD, SHOPEE FOOD, LAP TAMBAHAN.
 * Struktur identik dengan LAP. PENJUALAN — produk di baris, tanggal di kolom.
 *
 * channel map:
 *   "GRAB"    → "grabfood"
 *   "GO FOOD" → "gofood"
 *   "SHOPEE"  → "shopeefood"
 *   "TAMBAHAN"→ "tambahan"
 */

import { getSheetRows, toDateString, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";
import type { ProductSaleItem } from "./parsePenjualan";

const PLATFORM_SHEETS: { keyword: string; channel: string }[] = [
  { keyword: "GRAB",     channel: "grabfood"   },
  { keyword: "GO FOOD",  channel: "gofood"     },
  { keyword: "GO",       channel: "gofood"     },
  { keyword: "SHOPEE",   channel: "shopeefood" },
  { keyword: "TAMBAHAN", channel: "tambahan"   },
];

const HEADER_ROW    = 5; // index 5 = row 6
const DATA_START    = 7; // index 7 = row 8
const DAILY_START   = 3;
const DAILY_END     = 9;
const COL_UNIT_PRICE = 15;
const COL_FC_ITEM   = 13;

function detectChannel(sheetName: string): string | null {
  const upper = sheetName.toUpperCase();
  // Skip sheet "LAP. PENJUALAN" utama (sudah diparsing oleh parsePenjualan)
  if (!upper.includes("PENJUALAN") && !upper.includes("TAMBAHAN")) return null;
  if (upper === "LAP. PENJUALAN" || upper === "LAP PENJUALAN") return null;

  for (const p of PLATFORM_SHEETS) {
    if (upper.includes(p.keyword)) return p.channel;
  }
  return null;
}

export function parsePlatformSales(wb: XLSX.WorkBook): ProductSaleItem[] {
  const result: ProductSaleItem[] = [];

  for (const sheetName of wb.SheetNames) {
    const channel = detectChannel(sheetName);
    if (!channel) continue;

    const rows = getSheetRows(wb, sheetName);
    const headerRow = rows[HEADER_ROW] ?? [];

    // Ekstrak tanggal dari header row
    const dates: (string | null)[] = [];
    for (let c = DAILY_START; c <= DAILY_END; c++) {
      dates.push(toDateString(headerRow[c]));
    }
    if (!dates.some((d) => d !== null)) continue;

    for (let i = DATA_START; i < rows.length; i++) {
      const row = rows[i];
      const productName = String(row[1] ?? row[2] ?? "").trim();
      if (!productName || productName.toUpperCase().includes("TOTAL") || productName.toUpperCase().includes("JUMLAH")) continue;

      const unitPrice = toNumber(row[COL_UNIT_PRICE]);
      const foodCostItem = toNumber(row[COL_FC_ITEM]);

      for (let d = 0; d < 7; d++) {
        const qty = toNumber(row[DAILY_START + d]);
        const date = dates[d];
        if (!date || qty <= 0) continue;
        result.push({
          businessDate: date,
          productName,
          qty,
          amount: qty * unitPrice,
          unitPrice,
          foodCostItem: foodCostItem > 0 ? foodCostItem : undefined,
          channel,
        });
      }
    }
  }

  return result;
}
