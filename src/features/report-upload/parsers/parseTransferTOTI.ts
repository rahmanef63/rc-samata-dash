/**
 * Parser sheet "TO - TI" — Transfer Out / Transfer In.
 *
 * Struktur: 6 side-by-side sections at column offsets 0, 5, 10, 15, 20, 25.
 *   Row 0: Section titles (e.g., "TO / TI   PERKEDEL", "TO CATTERING STAFF", etc.)
 *   Row 4: Column headers (NAMA BAHAN/PRODUCT, QTY, HARGA BELI/JUAL, TOTAL)
 *   Rows 5+: Item data
 *   Each section has 4 columns: name, qty, price, total
 *
 * Also checks for standalone sheets: "TO-TI PERKEDEL", "TO CATTERING STAFF"
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

function classifyDirection(sectionTitle: string): "out" | "in" {
  const up = sectionTitle.toUpperCase();
  // "TI" alone = transfer in, but "TO / TI" is mixed (treat as out for perkedel ingredients)
  if (up.includes("TO") && !up.includes("TI")) return "out";
  if (up.includes("TI") && !up.includes("TO")) return "in";
  // Mixed "TO / TI" sections — these are production transfers (out)
  return "out";
}

function extractCategory(sectionTitle: string): string {
  const up = sectionTitle.toUpperCase().trim();
  // Extract the meaningful part after "TO / TI" or "TO"
  const cleaned = up
    .replace(/TO\s*\/\s*TI\s*/g, "")
    .replace(/^TO\s+/g, "")
    .replace(/^TI\s+/g, "")
    .trim();
  return cleaned || "UMUM";
}

function parseSideBySideSections(rows: (string | number | Date | null | boolean)[][]): TransferItem[] {
  const result: TransferItem[] = [];

  // Detect section positions from row 0 (titles) or row 4 (headers)
  const titleRow = rows[0] ?? [];
  const headerRow = rows[4] ?? [];

  // Find section start columns — look for non-empty cells in row 0
  const sections: { col: number; title: string }[] = [];
  for (let c = 0; c < titleRow.length; c++) {
    const cell = String(titleRow[c] ?? "").trim();
    if (cell.length > 2 && (cell.toUpperCase().includes("TO") || cell.toUpperCase().includes("TI") || cell.toUpperCase().includes("FREE"))) {
      sections.push({ col: c, title: cell });
    }
  }

  // Fallback: if no sections found in row 0, check known positions
  if (sections.length === 0) {
    // Try header row to find "NAMA" columns
    for (let c = 0; c < headerRow.length; c++) {
      const cell = String(headerRow[c] ?? "").toUpperCase().trim();
      if (cell.includes("NAMA")) {
        sections.push({ col: c, title: `Section ${sections.length + 1}` });
      }
    }
  }

  if (sections.length === 0) return result;

  // Parse each section
  for (const section of sections) {
    const { col, title } = section;
    const direction = classifyDirection(title);
    const category = extractCategory(title);

    // Items start at row 5, columns: col+0=name, col+1=qty, col+2=price, col+3=total
    for (let r = 5; r < rows.length; r++) {
      const row = rows[r];
      const name = String(row[col] ?? "").trim();
      if (!name) continue;

      const upper = name.toUpperCase();
      if (upper.includes("SUB TOTAL") || upper.includes("TOTAL") ||
          upper.includes("FOOD COST") || upper.includes("PARAF") ||
          upper.includes("BUAT BERAPA") || upper.includes("JADI") ||
          upper.includes("CATATAN") || upper.includes("TOLONG") ||
          upper.includes("NB.") || upper.startsWith("(")) continue;

      const qty = toNumber(row[col + 1]);
      const price = toNumber(row[col + 2]);
      const total = toNumber(row[col + 3]);

      // Skip rows with no numeric data
      if (qty === 0 && price === 0 && total === 0) continue;

      result.push({
        direction,
        category,
        itemName: name,
        qty,
        totalValue: total > 0 ? total : qty * price,
      });
    }
  }

  return result;
}

export function parseTransferTOTI(wb: XLSX.WorkBook): TransferItem[] {
  const result: TransferItem[] = [];

  // Main "TO - TI" sheet
  const mainSheet = wb.SheetNames.find((n) => {
    const up = n.toUpperCase().replace(/\s+/g, " ").trim();
    return up === "TO - TI" || up === "TO-TI" || up === "TO TI";
  });

  if (mainSheet) {
    const rows = getSheetRows(wb, mainSheet);
    result.push(...parseSideBySideSections(rows));
  }

  // Also check standalone sheets
  const standaloneSheets = wb.SheetNames.filter((n) => {
    const up = n.toUpperCase().replace(/\s+/g, " ").trim();
    return (up.includes("TO-TI") || up.includes("TO - TI") || up.includes("TO CATTERING")) &&
           up !== (mainSheet ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  });

  for (const sn of standaloneSheets) {
    const rows = getSheetRows(wb, sn);
    const items = parseSideBySideSections(rows);
    // If standalone sheet didn't parse well, try sequential approach
    if (items.length === 0) {
      const direction = sn.toUpperCase().includes("TI") && !sn.toUpperCase().includes("TO") ? "in" as const : "out" as const;
      const category = extractCategory(sn);
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const name = String(row[0] ?? row[1] ?? "").trim();
        if (!name || name.toUpperCase().includes("TOTAL")) continue;
        const qty = toNumber(row[1]) || toNumber(row[2]);
        const total = toNumber(row[3]) || toNumber(row[2]);
        if (qty === 0 && total === 0) continue;
        result.push({ direction, category, itemName: name, qty, totalValue: total });
      }
    } else {
      result.push(...items);
    }
  }

  return result;
}
