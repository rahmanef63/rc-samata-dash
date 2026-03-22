/**
 * Parser sheet "LAP. PENJUALAN" (Laporan Penjualan Harian per Produk)
 *
 * Struktur sheet:
 * - Row 0–5: header/judul
 * - Row 6–7: nama kolom (produk di baris, tanggal di kolom)
 * - Row 8+: data produk
 *
 * Kolom penting (index 0-based):
 *   [0]  NO
 *   [1]  PRODUCT (nama produk)
 *   [2]  (kadang duplikat PRODUCT)
 *   [3..9]  Qty harian (KAMIS–RABU, 7 kolom)
 *   [10] TOTAL UNIT
 *   [11] TOTAL Rp
 *   [12] %
 *   [13] FC ITEM (food cost per item)
 *   [14] CON FC
 *   [15] HARGA (UNIT)
 *
 * Setiap produk punya 7 kolom harian → kita generate 7 record per produk.
 * Tanggal hari diambil dari header baris 7 (kolom 3–9).
 */

import { getSheetRows, toDateString, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type ProductSaleItem = {
  businessDate: string;
  productName: string;
  qty: number;
  amount: number;
  unitPrice: number;
  foodCostItem?: number;
};

const HEADER_ROW = 6;   // baris tanggal ada di sini
const DATA_START = 8;   // baris pertama data produk
const DAILY_COL_START = 3;
const DAILY_COL_END = 9; // inklusif (7 hari: kamis s/d rabu)
const COL_UNIT_PRICE = 15;
const COL_FC_ITEM = 13;

export function parsePenjualan(wb: XLSX.WorkBook): ProductSaleItem[] {
  const sheetName = wb.SheetNames.find((n) =>
    n.toUpperCase().includes("PENJUALAN") && !n.toUpperCase().includes("GRAB") && !n.toUpperCase().includes("GO") && !n.toUpperCase().includes("SHOPEE")
  );
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: ProductSaleItem[] = [];

  // Ekstrak tanggal dari baris header (row 7, index 7 dalam 0-based)
  const headerRow = rows[HEADER_ROW] ?? [];
  const dates: (string | null)[] = [];
  for (let c = DAILY_COL_START; c <= DAILY_COL_END; c++) {
    dates.push(toDateString(headerRow[c]));
  }

  // Jika tidak ada tanggal valid sama sekali, skip
  const hasAnyDate = dates.some((d) => d !== null);
  if (!hasAnyDate) return [];

  for (let i = DATA_START; i < rows.length; i++) {
    const row = rows[i];

    // Deteksi stop: baris total / subtotal / kosong
    const firstCell = String(row[0] ?? "").toUpperCase();
    const secondCell = String(row[1] ?? row[2] ?? "").toUpperCase();
    if (
      firstCell.includes("TOTAL") ||
      secondCell.includes("TOTAL") ||
      secondCell.includes("JUMLAH") ||
      secondCell === ""
    ) {
      // Bukan stop total, cek apakah ini baris produk
      // Jika unitPrice = 0 dan nama kosong, skip saja
      if (!row[1] && !row[2]) continue;
    }

    // Nama produk di kolom 1 atau 2
    const productName = String(row[1] ?? row[2] ?? "").trim();
    if (!productName || productName.toUpperCase().includes("TOTAL") || productName.toUpperCase().includes("JUMLAH")) continue;

    const unitPrice = toNumber(row[COL_UNIT_PRICE]);
    const foodCostItem = toNumber(row[COL_FC_ITEM]);

    // Generate record per hari
    for (let d = 0; d < 7; d++) {
      const qty = toNumber(row[DAILY_COL_START + d]);
      const date = dates[d];
      if (!date || qty <= 0) continue;

      result.push({
        businessDate: date,
        productName,
        qty,
        amount: qty * unitPrice,
        unitPrice,
        foodCostItem: foodCostItem > 0 ? foodCostItem : undefined,
      });
    }
  }

  return result;
}
