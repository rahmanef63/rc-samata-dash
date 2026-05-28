import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseWeeklyFC } from "./parseWeeklyFC";

// "WEEKLY FC" → inventory valuation, grouped under category header rows.
// Per data row: name (col0/1), qty (first num <1000), totalValue (largest num),
// unitPrice = total/qty, unit = short string after name.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa), sheet);
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 3 }, () => []);
  rows[0] = ["WEEKLY FC"];
  rows.push(["BAHAN AYAM"]); // category header (row 3, scan starts here)
  rows.push(["Paha Atas", 10, "KG", 30000, 300000]);
  rows.push(["Dada Ayam", 5, "KG", 28000, 140000]);
  rows.push(["TOTAL", null, null, null, 440000]);
  return rows;
};

describe("parseWeeklyFC", () => {
  it("groups items under the category header and derives qty/unitPrice/total", () => {
    const items = parseWeeklyFC(wb("WEEKLY FC", aoa()));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      category: "BAHAN AYAM",
      itemName: "Paha Atas",
      qty: 10,
      unit: "KG",
      unitPrice: 30000, // 300000 / 10
      totalValue: 300000,
    });
  });
  it("stops/skips TOTAL and returns [] without the sheet", () => {
    expect(parseWeeklyFC(wb("WEEKLY FC", aoa())).some((i) => i.itemName.toUpperCase().includes("TOTAL"))).toBe(false);
    expect(parseWeeklyFC(wb("OTHER", aoa()))).toEqual([]);
  });
});
