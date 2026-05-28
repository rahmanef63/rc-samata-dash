import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseOwnerTransfers } from "./parseOwnerTransfers";

// Extracts owner-transfer rows from the "Penerimaan/Pengeluaran lain-lain"
// sections of LAP. CF. classify() maps description → direction + purpose;
// the Pengeluaran section forces branch_to_owner.

function wb(sheet: string, aoa: unknown[][]): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet(aoa), sheet);
  return b;
}
const aoa = (): unknown[][] => [
  ["Penerimaan Lain-lain"],
  ["INJECT MODAL OWNER", "Rp", 1_000_000],
  ["TOP UP PETTY CASH", "Rp", 500_000],
  ["Total Penerimaan", "Rp", 1_500_000],
  ["Pengeluaran Lain-lain"],
  ["SETOR OWNER MALAM", "Rp", 2_000_000],
  ["SALDO AKHIR PER", "", 3_000_000],
];

describe("parseOwnerTransfers", () => {
  it("classifies income-section injections and petty-cash top-ups", () => {
    const items = parseOwnerTransfers(wb("LAP. CF", aoa()), "2026-04-07");
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ direction: "owner_to_branch", purpose: "adjustment", amount: 1_000_000, transferDate: "2026-04-07" });
    expect(items[1]).toMatchObject({ direction: "owner_to_branch", purpose: "petty_cash_topup", amount: 500_000 });
  });
  it("forces branch_to_owner for the Pengeluaran lain-lain section", () => {
    const items = parseOwnerTransfers(wb("LAP. CF", aoa()), "2026-04-07");
    expect(items[2]).toMatchObject({ direction: "branch_to_owner", purpose: "night_transfer", amount: 2_000_000 });
  });
  it("returns [] without a CF sheet", () => {
    expect(parseOwnerTransfers(wb("OTHER", aoa()), "2026-04-07")).toEqual([]);
  });
});
