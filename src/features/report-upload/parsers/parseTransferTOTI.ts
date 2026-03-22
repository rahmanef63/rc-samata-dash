/**
 * Parser sheet "TO - TI" — Transfer Out / Transfer In.
 *
 * Struktur:
 *   Section "TRANSFER OUT" lalu section "TRANSFER IN"
 *   Di bawah masing-masing section:
 *     - Sub-kategori (PERKEDEL, CATERING, STAFF MEAL, FREE ITEMS, dll)
 *     - Item rows: nama item, qty, unit, total value
 *
 * Parser mendeteksi direction dari label "TRANSFER OUT" / "TRANSFER IN",
 * lalu mengumpulkan item rows di bawahnya.
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type TransferItem = {
  direction: "out" | "in";
  category: string;
  itemName: string;
  qty: number;
  unit?: string;
  totalValue: number;
};

export function parseTransferTOTI(wb: XLSX.WorkBook): TransferItem[] {
  const sheetName = wb.SheetNames.find((n) => {
    const up = n.toUpperCase().replace(/\s+/g, " ").trim();
    return up.includes("TO - TI") || up.includes("TO-TI") || up === "TO TI";
  });
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: TransferItem[] = [];

  let currentDirection: "out" | "in" | null = null;
  let currentCategory = "UMUM";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = String(row[0] ?? "").toUpperCase().trim();
    const secondCell = String(row[1] ?? "").toUpperCase().trim();
    const label = firstCell || secondCell;

    // Detect direction sections
    if (label.includes("TRANSFER OUT") || label.includes("TRANSFER KELUAR")) {
      currentDirection = "out";
      currentCategory = "UMUM";
      continue;
    }
    if (label.includes("TRANSFER IN") || label.includes("TRANSFER MASUK")) {
      currentDirection = "in";
      currentCategory = "UMUM";
      continue;
    }

    if (!currentDirection) continue;

    // Stop at totals
    if (label.includes("TOTAL") || label.includes("JUMLAH")) {
      // If it's a section total (e.g. "TOTAL TRANSFER OUT"), skip but keep going
      if (label.includes("TRANSFER")) {
        currentDirection = null;
        continue;
      }
      continue;
    }

    // Detect sub-category headers (bold rows with no numeric data)
    const CATEGORIES = [
      "PERKEDEL", "CATERING", "STAFF MEAL", "STAFF", "FREE ITEM", "FREE",
      "PROMO", "SAMPLING", "COMPLIMENT", "DONASI", "LAIN", "AYAM",
    ];
    const isCategory = CATEGORIES.some((c) => label.includes(c));
    const hasNumeric = row.slice(2).some((v) => toNumber(v) > 0);

    if (isCategory && !hasNumeric) {
      currentCategory = String(row[0] ?? row[1] ?? "").trim();
      continue;
    }

    // Parse item row
    const itemName = String(row[1] ?? row[0] ?? "").trim();
    if (!itemName) continue;

    // Find qty and value columns — typically cols 2-5
    let qty = 0;
    let unit = "";
    let totalValue = 0;

    // Try common column positions
    for (let c = 2; c < Math.min(row.length, 10); c++) {
      const val = toNumber(row[c]);
      const cellStr = String(row[c] ?? "").trim();

      if (typeof row[c] === "string" && cellStr.match(/^[a-zA-Z]+$/)) {
        unit = cellStr; // e.g., "pcs", "kg", "porsi"
      } else if (val > 0) {
        if (qty === 0) {
          qty = val;
        } else {
          totalValue = val;
          break;
        }
      }
    }

    if (qty <= 0 && totalValue <= 0) continue;

    result.push({
      direction: currentDirection,
      category: currentCategory || "UMUM",
      itemName,
      qty,
      unit: unit || undefined,
      totalValue,
    });
  }

  return result;
}
