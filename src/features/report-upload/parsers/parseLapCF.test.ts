import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseLapCF } from "./parseLapCF";

// "LAP. CF" → daily cash flow with a running balance. Label-driven: SALDO AWAL
// seeds opening, Sales/Belanja tanggal accumulate per date, SALDO AKHIR pins
// the final closing. otherInflow from the "Penerimaan lain-lain" section.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), sheet);
  return b;
}

const base = (): unknown[][] => [
  ["SALDO AWAL PER", "", 1_000_000],
  ["Sales tanggal,", new Date(2026, 3, 1), "Rp", 500_000],
  ["Belanja tanggal,", new Date(2026, 3, 1), "Rp", 200_000],
  ["Sales tanggal,", new Date(2026, 3, 2), "Rp", 600_000],
  ["SALDO AKHIR PER", "", 1_700_000],
];

describe("parseLapCF", () => {
  it("builds a running-balance record per date", () => {
    const items = parseLapCF(wb("LAP. CF", base()));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      businessDate: "2026-04-01",
      openingBalance: 1_000_000,
      salesInflow: 500_000,
      expenseOutflow: 200_000,
      closingBalance: 1_300_000, // 1,000,000 + 500,000 − 200,000
    });
    // last day's closing is pinned to SALDO AKHIR
    expect(items[1]).toMatchObject({
      businessDate: "2026-04-02",
      openingBalance: 1_300_000,
      salesInflow: 600_000,
      closingBalance: 1_700_000,
    });
  });

  it("captures other-income items, ignoring section subtotals", () => {
    const aoa: unknown[][] = [
      ["SALDO AWAL PER", "", 1_000_000],
      ["Sales tanggal,", new Date(2026, 3, 1), "Rp", 500_000],
      ["Penerimaan Lain-lain"],
      ["TOP UP MODAL", "Rp", 100_000],
      ["Total Penerimaan", "Rp", 100_000],
      ["SALDO AKHIR PER", "", 1_600_000],
    ];
    const items = parseLapCF(wb("LAP. CF", aoa));
    expect(items[0].otherInflow).toBe(100_000); // TOP UP counted, "Total" row skipped
  });

  it("returns [] for missing sheet or no dated rows", () => {
    expect(parseLapCF(wb("OTHER", base()))).toEqual([]);
    expect(parseLapCF(wb("LAP. CF", [["SALDO AWAL PER", "", 1000]]))).toEqual([]);
  });
});
