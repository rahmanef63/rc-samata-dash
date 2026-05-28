import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseIkhtisarFC } from "./parseIkhtisarFC";

// "IKHTISAR FOOD COST" → one summary record per category (FOOD & BEVERAGE,
// PAPER). Category columns detected from the header; labeled rows fill
// opening/purchase/closing/usage/sales.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa), sheet);
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 6 }, () => []);
  rows[0] = ["IKHTISAR FOOD COST"];
  rows.push([null, "FOOD & BEVERAGE", null, "PAPER"]); // header → F&B col 1, PAPER col 3
  rows.push(["PERSEDIAAN AWAL", 1_000_000, null, 200_000]);
  rows.push(["TOTAL PEMBELIAN", 5_000_000, null, 500_000]);
  rows.push(["PERSEDIAAN AKHIR", 800_000, null, 150_000]);
  rows.push(["JUMLAH YANG DIPAKAI", 5_200_000, null, 550_000]);
  rows.push(["PENJUALAN BERSIH", 20_000_000]);
  return rows;
};

describe("parseIkhtisarFC", () => {
  it("produces one record per category with its column's values", () => {
    const items = parseIkhtisarFC(wb("IKHTISAR FOOD COST", aoa()));
    expect(items).toHaveLength(2);
    const fnb = items.find((i) => i.category === "FOOD & BEVERAGE");
    expect(fnb).toMatchObject({ openingValue: 1_000_000, purchaseValue: 5_000_000, closingValue: 800_000, usageValue: 5_200_000, salesRevenue: 20_000_000 });
    const paper = items.find((i) => i.category === "PAPER");
    expect(paper).toMatchObject({ openingValue: 200_000, purchaseValue: 500_000, closingValue: 150_000, usageValue: 550_000 });
    expect(paper?.salesRevenue).toBeUndefined();
  });
  it("returns [] without the sheet", () => {
    expect(parseIkhtisarFC(wb("OTHER", aoa()))).toEqual([]);
  });
});
