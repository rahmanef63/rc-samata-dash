import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parsePlatformSales } from "./parsePlatformSales";

// Per-platform sales (GoFood/GrabFood/ShopeeFood/Tambahan/PPN). Same layout as
// parsePenjualan but tagged with `channel`; the plain "LAP. PENJUALAN" sheet is
// excluded (owned by parsePenjualan). Variant sheets read product from col 2.

const r = (assign: Record<number, unknown>): unknown[] => {
  const a: unknown[] = Array(19).fill(null);
  for (const k of Object.keys(assign)) a[Number(k)] = assign[Number(k)];
  return a;
};
function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), sheet);
  return b;
}
const aoa = (nameCol1: string, nameCol2?: string): unknown[][] => [
  r({ 0: "LAPORAN" }), r({}), r({}), r({}),
  r({ 3: new Date(2026, 3, 1), 4: new Date(2026, 3, 2), 5: new Date(2026, 3, 3), 16: "FC ITEM", 18: "HARGA" }),
  r({ 1: "(hari)" }),
  r({ 1: nameCol1, 2: nameCol2 ?? null, 3: 5, 4: 3, 5: 0, 16: 8000, 18: 15000 }),
  r({ 1: "TOTAL", 3: 99 }),
];

describe("parsePlatformSales", () => {
  it("tags records with the detected channel", () => {
    const items = parsePlatformSales(wb("LAP. PENJUALAN GO FOOD", aoa("AYAM GEPREK")));
    expect(items).toHaveLength(2); // day1 qty5, day2 qty3
    expect(items.every((i) => i.channel === "gofood")).toBe(true);
    expect(items[0]).toMatchObject({ productName: "AYAM GEPREK", qty: 5, amount: 75000, channel: "gofood" });
  });

  it("excludes the plain LAP. PENJUALAN sheet (owned by parsePenjualan)", () => {
    expect(parsePlatformSales(wb("LAP. PENJUALAN", aoa("AYAM GEPREK")))).toEqual([]);
  });

  it("reads product name from col 2 on variant sheets (TAMBAHAN)", () => {
    const items = parsePlatformSales(wb("LAP. PENJUALAN TAMBAHAN", aoa("Dada", "Dada Matah Spesial")));
    expect(items[0]).toMatchObject({ productName: "Dada Matah Spesial", channel: "tambahan" });
  });
});
