/**
 * Parser sheet "HITUNGAN HPP PRODUK" + "FOOD COST ITEM KELAS 2/3A/3B/4"
 *
 * Layout RC Samata = HORIZONTAL multi-column:
 *   - Setiap ~3 kolom = satu blok produk (col c = label, c+1 = value, c+2 = blank)
 *   - Banyak produk berdampingan per baris
 *   - Tipe HPP yang relevan:
 *       "HPP <NAMA>"   — raw product (DADA, P.ATAS, P.BAWAH, SAYAP, dll)
 *       "HPP NON CVR"  — paket tanpa pembungkus cover
 *       "HPP + COVER"  — paket dengan pembungkus cover
 *       "HPP 1 PORSI"  — per-portion recipe (ingredient/saos)
 *       "HPP 1 RESEP"  — recipe total
 *
 *   Product name buat "NON CVR"/"+ COVER" = walk UP kolom yg sama, ambil
 *   1-2 header (label tanpa value di kolom value) sebelum hit ingredient
 *   atau HPP lain.
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type HPPIngredient = {
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  subtotal: number;
};

export type ProductHPPItem = {
  productName: string;
  pricingClass: "standard" | "kelas2" | "kelas3a" | "kelas3b" | "kelas4";
  totalHPP: number;
  sellingPrice?: number;
  ingredients: HPPIngredient[];
};

const CLASS_PATTERNS: { pattern: RegExp; cls: ProductHPPItem["pricingClass"] }[] = [
  { pattern: /KELAS\s*3\s*A/i, cls: "kelas3a" },
  { pattern: /KELAS\s*3\s*B/i, cls: "kelas3b" },
  { pattern: /KELAS\s*4/i, cls: "kelas4" },
  { pattern: /KELAS\s*2/i, cls: "kelas2" },
];

function detectClass(sheetName: string): ProductHPPItem["pricingClass"] {
  for (const { pattern, cls } of CLASS_PATTERNS) {
    if (pattern.test(sheetName)) return cls;
  }
  return "standard";
}

// Generic recipe labels yang BUKAN nama produk — skip
const GENERIC_HPP_NAMES = new Set([
  "1 PORSI", "1 RESEP", "1 LITER", "1 PCK", "1 PACK",
  "NON CVR", "+ COVER", "1 PORSI+TIMUN", "15 PORSI",
  "20 PORSI", "30 PORSI",
]);

// Expand RC Samata-specific abbreviations into full sales-side names
// supaya matcher di validator nemu. Single-tenant alias map.
const ABBR_EXPANSIONS: Array<[RegExp, string]> = [
  [/^P\.\s*ATAS$/i, "PAHA ATAS"],
  [/^P\.\s*BAWAH$/i, "PAHA BAWAH"],
  [/^P\.\s*BAWAH\s+U\/.*/i, "PAHA BAWAH"],
  [/^P\.\s*ATAS\s+U\/.*/i, "PAHA ATAS"],
  [/^C\.\s*STEAK$/i, "CHICKEN STEAK"],
  [/^C\.\s*STRIP[S]?$/i, "CHICKEN STRIPS"],
  [/^DADA\s+U\/.*/i, "DADA"],
];

function expandProductAlias(name: string): string {
  for (const [re, full] of ABBR_EXPANSIONS) {
    if (re.test(name)) return full;
  }
  return name;
}

function isGenericHppName(name: string): boolean {
  const up = name.toUpperCase().trim();
  if (GENERIC_HPP_NAMES.has(up)) return true;
  if (/^\d+\s*(PORSI|RESEP|LITER|ML|PCK|PCS|PACK)/.test(up)) return true;
  if (/^(NON|\+|COVER)/.test(up)) return true;
  return false;
}

// Detect raw product extracted from "HPP <NAME>" label — strip prefix +
// suffixes like "U/GPRK & LVL".
function extractRawProductName(labelUpper: string): string | null {
  // "HPP DADA U/GPRK & LVL" → "DADA U/GPRK & LVL" → strip suffix → "DADA"
  const m = labelUpper.match(/^HPP\s+(.+?)(?:\s+U\/.*)?$/);
  if (!m) return null;
  let name = m[1].trim();
  // Strip parenthetical suffixes
  name = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (isGenericHppName(name)) return null;
  if (name.length < 2 || name.length > 30) return null;
  // Expand RC Samata abbreviation
  return expandProductAlias(name);
}

// For "HPP NON CVR" / "HPP + COVER" cells, climb the column to grab
// 1-2 closest headers (cells where adjacent value column is empty —
// indicates sub-product label, not ingredient line).
function climbColumnForHeader(
  rows: (string | number | Date | null | boolean)[][],
  startRow: number,
  col: number,
  maxLookback = 18,
): string {
  const headers: string[] = [];
  const seenLabels = new Set<string>();
  for (let r = startRow - 1; r >= Math.max(0, startRow - maxLookback); r--) {
    const cell = rows[r]?.[col];
    if (cell == null || cell === "") continue;
    const lbl = String(cell).trim();
    if (!lbl) continue;
    if (seenLabels.has(lbl)) continue;
    const lblUp = lbl.toUpperCase();
    // Stop on another HPP label
    if (/^HPP\s/.test(lblUp)) break;
    // Adjacent value cell: header if empty/blank, ingredient if numeric
    const nextCell = rows[r]?.[col + 1];
    const hasNumericNext = toNumber(nextCell) > 0;
    if (hasNumericNext) {
      // Ingredient row — skip
      continue;
    }
    // Truncate overly long section titles (kelas headers) — take first 4 words
    const cleanLbl = lbl.length > 50 ? lbl.split(/\s+/).slice(0, 4).join(" ") : lbl;
    headers.unshift(cleanLbl);
    seenLabels.add(lbl);
    if (headers.length >= 3) break;
  }
  return headers.join(" ").replace(/\s+/g, " ").trim();
}

export function parseHPPProduk(wb: XLSX.WorkBook): ProductHPPItem[] {
  const result: ProductHPPItem[] = [];

  const sheets: { name: string; cls: ProductHPPItem["pricingClass"] }[] = [];
  for (const name of wb.SheetNames) {
    const up = name.toUpperCase();
    if (up.includes("HITUNGAN HPP") || up.includes("HPP PRODUK")) {
      sheets.push({ name, cls: "standard" });
    } else if (up.includes("FOOD COST ITEM KELAS") || up.includes("FC ITEM KELAS")) {
      sheets.push({ name, cls: detectClass(name) });
    }
  }

  for (const { name, cls } of sheets) {
    const items = parseHPPSheetHorizontal(wb, name, cls);
    result.push(...items);
  }

  // Dedup by productName + pricingClass — prefer "with_cover" if same name has
  // both variants. Also prefer first occurrence (raw products usually first).
  type Bucket = ProductHPPItem & { variant: "raw" | "non_cover" | "with_cover" };
  const seen = new Map<string, Bucket>();
  for (const r of result as Bucket[]) {
    const key = `${r.productName.toUpperCase()}::${r.pricingClass}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, r);
      continue;
    }
    // Replace if new is "with_cover" or existing is non_cover with no cover ver
    if (r.variant === "with_cover" && existing.variant !== "with_cover") {
      seen.set(key, r);
    }
  }
  const dedupped = Array.from(seen.values()).map(({ variant: _v, ...rest }) => {
    void _v;
    return rest;
  });
  return dedupped;
}

function parseHPPSheetHorizontal(
  wb: XLSX.WorkBook,
  sheetName: string,
  pricingClass: ProductHPPItem["pricingClass"],
): (ProductHPPItem & { variant: "raw" | "non_cover" | "with_cover" })[] {
  const rows = getSheetRows(wb, sheetName);
  const result: (ProductHPPItem & { variant: "raw" | "non_cover" | "with_cover" })[] = [];

  // Determine sheet max width
  const maxWidth = Math.max(...rows.map((r) => r.length));

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < maxWidth; c++) {
      const cell = rows[r][c];
      if (cell == null || cell === "") continue;
      const label = String(cell).trim();
      if (!label) continue;
      const labelUp = label.toUpperCase();

      // Only "HPP" prefix lines matter
      if (!labelUp.startsWith("HPP")) continue;

      const valueRaw = rows[r][c + 1];
      const value = toNumber(valueRaw);
      if (value <= 0) continue;

      // Case A: "HPP <NAME>" — raw product (DADA, P.ATAS, dll)
      // Strip "1 PORSI", "1 RESEP", "NON CVR", "+ COVER" — those handled in B.
      if (
        !labelUp.includes("NON CVR") &&
        !labelUp.includes("+ COVER") &&
        !/^HPP\s+\d/.test(labelUp) &&
        !/^HPP\s+1\s/.test(labelUp)
      ) {
        const rawName = extractRawProductName(labelUp);
        if (rawName) {
          result.push({
            productName: rawName,
            pricingClass,
            totalHPP: value,
            ingredients: [],
            variant: "raw",
          });
          continue;
        }
      }

      // Case B: "HPP NON CVR" / "HPP + COVER" / "HPP 1 PORSI+TIMUN" —
      // package product. Climb column for header chain.
      if (
        labelUp.includes("NON CVR") ||
        labelUp.includes("+ COVER") ||
        /^HPP\s+1\s+PORSI\s*\+/.test(labelUp)
      ) {
        const productName = climbColumnForHeader(rows, r, c);
        if (productName && productName.length >= 2 && productName.length <= 60) {
          const variant = labelUp.includes("+ COVER") ? "with_cover" : "non_cover";
          result.push({
            productName,
            pricingClass,
            totalHPP: value,
            ingredients: [],
            variant,
          });
        }
      }
    }
  }

  return result;
}
