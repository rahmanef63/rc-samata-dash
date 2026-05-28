import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseCostAnalysis } from "./parseCostAnalysis";

// "COST ANALYSIS" → per-item opening/purchase/usage/closing qty+value. Header
// auto-detected by OPENING+CLOSING labels; value cols assumed to follow qty.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa), sheet);
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 5 }, () => []);
  rows[0] = ["COST ANALYSIS"];
  // main header (row 5): name | unit | OPENING | (val) | PEMBELIAN | (val) | PEMAKAIAN | (val) | CLOSING | (val) | VARIANCE
  rows.push(["NAMA BAHAN", "SATUAN", "OPENING", "", "PEMBELIAN", "", "PEMAKAIAN", "", "CLOSING", "", "VARIANCE"]);
  rows.push([]); // sub-header (blank → keeps main mapping, val = qty+1)
  rows.push(["Ayam Potong", "KG", 10, 100000, 20, 200000, 25, 250000, 5, 50000, 500]);
  rows.push(["Tepung", "KG", 5, 50000, 10, 100000, 12, 120000, 3, 30000, 0]);
  rows.push(["TOTAL", "", 0, 0]);
  return rows;
};

describe("parseCostAnalysis", () => {
  it("maps qty/value sections and reads variance", () => {
    const items = parseCostAnalysis(wb("COST ANALYSIS", aoa()));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      itemName: "Ayam Potong",
      unit: "KG",
      openingQty: 10, openingValue: 100000,
      purchaseQty: 20, purchaseValue: 200000,
      usageQty: 25, usageValue: 250000,
      closingQty: 5, closingValue: 50000,
      variance: 500,
    });
  });
  it("stops at TOTAL and returns [] without the sheet", () => {
    expect(parseCostAnalysis(wb("COST ANALYSIS", aoa())).some((i) => i.itemName.toUpperCase().includes("TOTAL"))).toBe(false);
    expect(parseCostAnalysis(wb("OTHER", aoa()))).toEqual([]);
  });
});
