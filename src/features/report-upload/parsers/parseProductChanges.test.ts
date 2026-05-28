import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseProductChanges, extractPeriodLabel } from "./parseProductChanges";

// "PERGANTIAN PRODUK" → expired/replaced ingredients. First sheet, data from
// row 10, stops at TOTAL, skips zero-total template rows.

function wb(aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), "Sheet1");
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 10 }, () => []);
  rows[0] = ["PERGANTIAN PRODUK"];
  rows[6] = [null, "22-31 JANUARI 2026"];
  rows.push(["Ayam Potong", new Date(2026, 0, 22), "KG", 30000, 5, 16500, 150000]);
  rows.push(["Tepung", null, "KG", 10000, 2, 0, 20000]);
  rows.push(["TOTAL", null, null, null, null, null, 170000]);
  return rows;
};

describe("parseProductChanges", () => {
  it("parses item rows, stops at TOTAL", () => {
    const items = parseProductChanges(wb(aoa()));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ itemName: "Ayam Potong", unit: "KG", unitPrice: 30000, qty: 5, ppn: 16500, totalPrice: 150000, expiredDate: "2026-01-22" });
  });
  it("extracts the period label from row 6", () => {
    expect(extractPeriodLabel(wb(aoa()))).toBe("22-31 JANUARI 2026");
  });
  it("returns [] for a workbook with no sheets", () => {
    expect(parseProductChanges(XLSX.utils.book_new())).toEqual([]);
  });
});
