import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseLeftOver } from "./parseLeftOver";

const r = (assign: Record<number, unknown>): unknown[] => {
  const a: unknown[] = Array(9).fill(null);
  for (const k of Object.keys(assign)) a[Number(k)] = assign[Number(k)];
  return a;
};
function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), sheet);
  return b;
}
const aoa = (): unknown[][] => [
  r({ 0: "LEFT OVER" }), r({}), r({}), r({}), r({}), r({}), r({}),
  r({ 2: new Date(2026, 3, 1), 3: new Date(2026, 3, 2) }), // DATE_ROW = 7
  r({ 0: "AYAM GEPREK", 2: 2, 3: 0 }),
  r({ 0: "NASI", 2: 1, 3: 3 }),
  r({ 0: "TOTAL", 2: 5, 3: 5 }),
];

describe("parseLeftOver", () => {
  it("emits one record per (item, day-with-qty), skipping TOTAL and zero-qty", () => {
    const items = parseLeftOver(wb("LEFT OVER", aoa()));
    expect(items).toHaveLength(3); // AYAM d1; NASI d1 + d2
    expect(items[0]).toEqual({ businessDate: "2026-04-01", itemName: "AYAM GEPREK", qty: 2 });
    expect(items.some((i) => i.itemName === "TOTAL")).toBe(false);
  });
  it("returns [] when no LEFT OVER sheet", () => {
    expect(parseLeftOver(wb("OTHER", aoa()))).toEqual([]);
  });
});
