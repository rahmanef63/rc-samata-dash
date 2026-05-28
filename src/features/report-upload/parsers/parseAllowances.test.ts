import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseAllowances } from "./parseAllowances";

// "PENGAJUAN TUNJANGAN KHUSUS" → per-employee allowances (luar kota / transport
// / kos). First sheet, data rows 8-22, keyed on NAMA LENGKAP (col 1).

function wb(aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), "1.");
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 8 }, () => []);
  rows[0] = ["PENGAJUAN TUNJANGAN KHUSUS"];
  rows.push([1, "Budi Santoso", new Date(2025, 0, 1), "Cook", "RC A", "RC B", "Antar Store", "10km", "30min", 500000, 200000, 800000, "Reimburse", "Kos A"]);
  rows.push([2, "Siti Aminah", null, "Server", null, null, null, null, null, 300000, 100000, 0]);
  rows.push([3, "", null, null]); // empty name → skipped
  return rows;
};

describe("parseAllowances", () => {
  it("parses per-employee allowance amounts", () => {
    const items = parseAllowances(wb(aoa()));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      employeeName: "Budi Santoso",
      position: "Cook",
      luarKotaAmount: 500000,
      subsidiTransportAmount: 200000,
      budgetKosAmount: 800000,
    });
    expect(items[1].subsidiTransportAmount).toBe(100000);
  });
  it("returns [] for a workbook with no sheets", () => {
    expect(parseAllowances(XLSX.utils.book_new())).toEqual([]);
  });
});
