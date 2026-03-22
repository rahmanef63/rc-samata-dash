/**
 * Parser sheet "VENDOR" (Pembelian & Stok Bahan Mingguan)
 *
 * Sheet ini kompleks — tracking stok opening/closing per komoditi.
 * Kita ambil data summary per komoditi:
 *   - Nama komoditi (kolom C)
 *   - Opening qty & value
 *   - Total purchase qty & value
 *   - Usage qty (derived: opening + purchase - closing)
 *   - Closing qty & value
 *
 * Komoditi yang ditrack: DADA MENTOK, DADA, PAHA ATAS, PAHA BAWAH,
 * SAYAP, CHICKEN PATTY, PERKEDEL/BARGUD
 *
 * Strategi: scan baris, cari nama komoditi yang dikenal, ambil angka.
 * Opening ada di kolom ~3-4 (value, qty), Closing di kolom ~30-31.
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type VendorPurchaseItem = {
  commodityName: string;
  openingQty: number;
  openingValue: number;
  purchaseQty: number;
  purchaseValue: number;
  usageQty: number;
  closingQty: number;
  closingValue: number;
};

// Nama komoditi yang dikenal
const KNOWN_COMMODITIES = [
  "DADA MENTOK",
  "DADA",
  "PAHA ATAS",
  "PAHA BAWAH",
  "SAYAP",
  "CHICKEN PATTY",
  "PERKEDEL",
  "BARGUD",
];

function matchesCommodity(cellValue: unknown): string | null {
  const s = String(cellValue ?? "").trim().toUpperCase();
  for (const name of KNOWN_COMMODITIES) {
    if (s.includes(name)) return name;
  }
  return null;
}

export function parseVendor(wb: XLSX.WorkBook): VendorPurchaseItem[] {
  const sheetName = wb.SheetNames.find((n) => n.toUpperCase() === "VENDOR");
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: VendorPurchaseItem[] = [];

  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];

    // Cari nama komoditi di kolom C (index 2)
    const name = matchesCommodity(row[2]);
    if (!name) continue;

    // Angka di sheet ini tersebar di banyak kolom.
    // Scan semua kolom numerik di baris ini dan tetangga untuk ambil:
    // Opening (biasanya kolom 3-4), Purchase aggregate, Closing (kolom ~30+)

    // Ambil semua nilai numerik dari row
    const nums = row.map((v) => toNumber(v));

    // Opening value = kolom 3, Opening qty = kolom 4
    const openingValue = nums[3] ?? 0;
    const openingQty = nums[4] ?? 0;

    // Kolom purchase: cari total purchase dari kolom yang tersedia
    // Struktur: kolom 5-18 adalah data harian, kita ambil sum sebagai purchase
    // (simplified — purchase biasanya di kolom tersendiri setelah opening)

    // Purchase total = sum kolom 5 sampai ~17 (nilai Rp)
    let purchaseValue = 0;
    let purchaseQty = 0;
    for (let c = 5; c <= 18; c++) {
      if (c % 2 === 1) purchaseValue += nums[c] ?? 0; // value di kolom ganjil
      else purchaseQty += nums[c] ?? 0;               // qty di kolom genap
    }

    // Closing: kolom ~30-31 (kolom terakhir dengan nilai)
    // Cari dua kolom numerik terakhir yang tidak nol
    let closingValue = 0;
    let closingQty = 0;
    for (let c = row.length - 1; c >= 20; c--) {
      const v = nums[c] ?? 0;
      if (v > 0) {
        if (closingQty === 0) closingQty = v;
        else if (closingValue === 0) { closingValue = v; break; }
      }
    }

    const usageQty = Math.max(0, openingQty + purchaseQty - closingQty);

    if (openingQty === 0 && purchaseQty === 0 && closingQty === 0) continue;

    result.push({
      commodityName: name,
      openingQty,
      openingValue,
      purchaseQty,
      purchaseValue,
      usageQty,
      closingQty,
      closingValue,
    });
  }

  return result;
}
