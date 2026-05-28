import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseLaporanKasPeriode } from "./parseLaporanKasPeriode";

// "LAPORAN KAS PERIODE" → daily gross/komisi/discount/net summary. Net is
// taken from the sheet or computed (gross − komisi − koreksi − discount).

const r = (assign: Record<number, unknown>): unknown[] => {
  const a: unknown[] = Array(8).fill(null);
  for (const k of Object.keys(assign)) a[Number(k)] = assign[Number(k)];
  return a;
};
function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), sheet);
  return b;
}
const aoa = (): unknown[][] => [
  r({ 0: "LAPORAN KAS PERIODE" }), r({}), r({}), r({}),
  r({ 1: new Date(2026, 3, 1), 2: new Date(2026, 3, 2) }), // DATE_ROW = 4
  r({}),
  r({ 0: "Penjualan Kotor", 1: 100000, 2: 80000 }),
  r({ 0: "Komisi Gofood", 1: 10000, 2: 8000 }),
  r({ 0: "Discount", 1: 5000, 2: 0 }),
];

describe("parseLaporanKasPeriode", () => {
  it("emits a daily summary per date with gross > 0", () => {
    const items = parseLaporanKasPeriode(wb("LAPORAN KAS PERIODE", aoa()));
    expect(items).toHaveLength(2);
  });
  it("computes netSales = gross − komisi − koreksi − discount when no net row", () => {
    const items = parseLaporanKasPeriode(wb("LAPORAN KAS PERIODE", aoa()));
    expect(items[0]).toMatchObject({ businessDate: "2026-04-01", grossSales: 100000, komisiGofood: 10000, discount: 5000, netSales: 85000 });
    expect(items[1].netSales).toBe(72000); // 80000 − 8000
  });
  it("returns [] when no KAS PERIODE sheet", () => {
    expect(parseLaporanKasPeriode(wb("LAP. CF", aoa()))).toEqual([]);
  });
});
