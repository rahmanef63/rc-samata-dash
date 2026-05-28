import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseInsentif } from "./parseInsentif";

// "INSENTIF" → employee incentives. Header row is auto-detected (NAMA + an
// amount-ish column); data starts 2 rows below; stops at TOTAL.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa), sheet);
  return b;
}
const aoa = (): unknown[][] => {
  const rows: unknown[][] = Array.from({ length: 7 }, () => []);
  rows[0] = ["INSENTIF"];
  rows[6] = ["No", "Nama", "Tgl Masuk", "Jabatan", "Insentif"]; // header → colName 1, colType 3, colAmount 4
  rows.push([]); // sub-header (startRow = headerRow + 2 = 8)
  rows.push([1, "Budi", "2026-01-01", "Kasir", 500000]);
  rows.push([2, "Siti", "2026-01-01", "Cook", 300000]);
  rows.push([null, "TOTAL", null, null, 800000]);
  return rows;
};

describe("parseInsentif", () => {
  it("extracts employee incentives using the detected header columns", () => {
    const items = parseInsentif(wb("INSENTIF", aoa()));
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ employeeName: "Budi", incentiveType: "Kasir", amount: 500000 });
    expect(items[1].amount).toBe(300000);
  });
  it("stops at TOTAL and returns [] for no sheet", () => {
    expect(parseInsentif(wb("INSENTIF", aoa())).some((i) => i.employeeName.toUpperCase().includes("TOTAL"))).toBe(false);
    expect(parseInsentif(wb("OTHER", aoa()))).toEqual([]);
  });
});
