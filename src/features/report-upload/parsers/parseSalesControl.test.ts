import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseSalesControl } from "./parseSalesControl";

// "SALES CONTROL" is month-to-date (rows from day 1). The parser must keep only
// rows inside [periodStart, periodEnd] so a weekly file doesn't double-count
// the prior week. DATA_START = row 12.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa), sheet);
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 12 }, () => []);
  rows[0] = ["SALES CONTROL"]; // populate row 0 so aoa_to_sheet range starts at row 0 (keeps DATA_START aligned)
  rows.push([5, 1_000_000, 50, 20000, null, null, 900_000, 1.1]); // day 5 — before period
  rows.push([10, 2_000_000, 80, 25000, null, null, 1_800_000, 1.1]); // day 10 — in
  rows.push([14, 1_500_000, 60, 25000, null, null, 1_600_000, 0.9]); // day 14 — in (boundary)
  rows.push([20, 999, 1, 1, null, null, 1, 0.1]); // day 20 — after period
  rows.push([0, 0]); // invalid day
  return rows;
};

describe("parseSalesControl", () => {
  it("keeps only rows within the file's period (MTD filter)", () => {
    const items = parseSalesControl(wb("SALES CONTROL", aoa()), "2026-01-08", "2026-01-14");
    expect(items.map((i) => i.businessDate)).toEqual(["2026-01-10", "2026-01-14"]);
    expect(items[0]).toMatchObject({ netSales: 2_000_000, customerCount: 80, targetSales: 1_800_000 });
  });
  it("returns [] without a sheet or without periodStart", () => {
    expect(parseSalesControl(wb("OTHER", aoa()), "2026-01-08")).toEqual([]);
    expect(parseSalesControl(wb("SALES CONTROL", aoa()), "")).toEqual([]);
  });
});
