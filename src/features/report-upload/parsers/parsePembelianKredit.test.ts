import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parsePembelianKredit } from "./parsePembelianKredit";

// "PEMBELIAN KREDIT" → credit purchases. Date + supplier are sparse in the
// sheet (carry-forward from the row above). DATA_START = 11; stops at TOTAL.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), sheet);
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 11 }, () => []);
  rows[0] = ["PEMBELIAN KREDIT"];
  rows.push([new Date(2026, 3, 1), "PT Ciomas", "Ayam Potong", "INV-1", 10, 15000, 150000, 7, null, new Date(2026, 4, 8)]);
  rows.push([null, null, "Tepung", "INV-2", 5, 10000, 50000]); // date + supplier carried forward
  rows.push([null, "TOTAL"]);
  return rows;
};

describe("parsePembelianKredit", () => {
  it("parses rows and carries forward sparse date + supplier", () => {
    const items = parsePembelianKredit(wb("PEMBELIAN KREDIT", aoa()));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ purchaseDate: "2026-04-01", supplierName: "PT Ciomas", itemName: "Ayam Potong", qty: 10, unitPrice: 15000, totalAmount: 150000 });
    expect(items[1]).toMatchObject({ purchaseDate: "2026-04-01", supplierName: "PT Ciomas", itemName: "Tepung", totalAmount: 50000 });
  });
  it("stops at TOTAL and returns [] for no sheet", () => {
    expect(parsePembelianKredit(wb("PEMBELIAN KREDIT", aoa())).some((i) => i.itemName.toUpperCase().includes("TOTAL"))).toBe(false);
    expect(parsePembelianKredit(wb("OTHER", aoa()))).toEqual([]);
  });
});
