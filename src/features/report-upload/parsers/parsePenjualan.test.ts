import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parsePenjualan } from "./parsePenjualan";

// parsePenjualan turns the "LAP. PENJUALAN" sheet into per-day product sales —
// the core revenue transform. A regression here misstates every sales figure.
// Fixtures are built as real WorkBooks so the sheet-name filter, date-row
// autodetect, and per-day record emission are all exercised end-to-end.

const row = (assign: Record<number, unknown>): unknown[] => {
  const r: unknown[] = Array(19).fill(null);
  for (const k of Object.keys(assign)) r[Number(k)] = assign[Number(k)];
  return r;
};

function wbWith(sheetName: string, aoa: unknown[][]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// Date row at index 4 (cols 3-5), day-name row at 5, data from row 6.
// FC ITEM col 16, HARGA col 18 (default positions, also labeled in header).
const aoa = (): unknown[][] => [
  row({ 0: "LAPORAN PENJUALAN HARIAN" }),
  row({}),
  row({}),
  row({}),
  row({ 0: "NO", 1: "PRODUK", 3: new Date(2026, 3, 1), 4: new Date(2026, 3, 2), 5: new Date(2026, 3, 3), 16: "FC ITEM", 18: "HARGA" }),
  row({ 1: "(hari)" }),
  row({ 1: "AYAM GEPREK", 3: 5, 4: 3, 5: 0, 16: 8000, 18: 15000 }),
  row({ 1: "TOTAL", 3: 99 }),
  row({ 1: "NASI PUTIH", 3: 2, 16: 1000, 18: 5000 }),
];

describe("parsePenjualan", () => {
  it("emits one record per (product, day-with-qty)", () => {
    const items = parsePenjualan(wbWith("LAP. PENJUALAN", aoa()));
    // AYAM GEPREK: day1 qty5, day2 qty3 (day3 qty0 skipped); NASI PUTIH: day1 qty2
    expect(items).toHaveLength(3);
  });

  it("computes amount = qty × unitPrice and carries date/fcItem", () => {
    const items = parsePenjualan(wbWith("LAP. PENJUALAN", aoa()));
    const first = items[0];
    expect(first).toMatchObject({
      businessDate: "2026-04-01",
      productName: "AYAM GEPREK",
      qty: 5,
      unitPrice: 15000,
      amount: 75000,
      foodCostItem: 8000,
    });
    const nasi = items.find((i) => i.productName === "NASI PUTIH");
    expect(nasi?.amount).toBe(10000);
  });

  it("skips TOTAL/JUMLAH rows and zero-qty days", () => {
    const items = parsePenjualan(wbWith("LAP. PENJUALAN", aoa()));
    expect(items.some((i) => i.productName.toUpperCase().includes("TOTAL"))).toBe(false);
    expect(items.every((i) => i.qty > 0)).toBe(true);
  });

  it("returns [] when no PENJUALAN sheet exists", () => {
    expect(parsePenjualan(wbWith("LAP. CF", aoa()))).toEqual([]);
  });

  it("excludes platform sheets (GOFOOD/GRAB/SHOPEE)", () => {
    expect(parsePenjualan(wbWith("PENJUALAN GOFOOD", aoa()))).toEqual([]);
  });

  it("returns [] when no date row is detectable", () => {
    const noDates = [row({ 0: "PENJUALAN" }), row({}), row({}), row({}), row({ 1: "AYAM", 3: 5 })];
    expect(parsePenjualan(wbWith("LAP. PENJUALAN", noDates))).toEqual([]);
  });
});
