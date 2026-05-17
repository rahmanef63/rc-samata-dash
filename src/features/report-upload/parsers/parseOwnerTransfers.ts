/**
 * Parser sheet "LAP. CF" — extract individual Penerimaan-lain-lain rows
 * as ownerTransfers records (owner → branch injections + branch-to-owner
 * pelunasan piutang) so they're traceable to source file.
 *
 * Heuristics (case-insensitive contains):
 *   "PERGANTIAN" / "TO JUAL"      → adjustment (revenue from non-sales)
 *   "TOP UP" + "PC|PETTY"          → petty_cash_topup, owner → branch
 *   "INJEC" + "PIUTANG|PELUNASAN"  → payable_payment_fund, owner → branch
 *   "INJEC" + "GAJI"               → adjustment (gaji), owner → branch
 *   "INJEC" / "INJECT"             → adjustment, owner → branch (fallback)
 *
 * "Pengeluaran lain-lain" section (after Total Pengeluaran) — symmetric:
 *   "SETOR" / "TRANSFER OWNER"     → night_transfer, branch → owner
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type OwnerTransferItem = {
  transferDate: string;
  direction: "branch_to_owner" | "owner_to_branch";
  purpose:
    | "night_transfer"
    | "petty_cash_topup"
    | "payable_payment_fund"
    | "adjustment";
  amount: number;
  referenceNo: string;
  description: string;
};

function rowContains(
  row: (string | number | Date | null | boolean)[],
  text: string,
): boolean {
  return row.some((cell) =>
    String(cell ?? "").toUpperCase().includes(text.toUpperCase()),
  );
}

function findAmount(row: (string | number | Date | null | boolean)[]): number {
  // Prefer the value right after an "Rp" / "RP." marker
  for (let c = 0; c < row.length; c++) {
    const cell = String(row[c] ?? "").toUpperCase().trim();
    if (cell === "RP" || cell === "RP." || cell === "RP ") {
      const v = toNumber(row[c + 1]);
      if (v > 0) return v;
    }
  }
  // Fallback: largest positive number on the row
  let max = 0;
  for (const cell of row) {
    const v = toNumber(cell);
    if (v > max) max = v;
  }
  return max;
}

function findDescription(
  row: (string | number | Date | null | boolean)[],
): string {
  // Take the first non-empty string cell that isn't a label like "Rp"
  for (const cell of row) {
    const s = String(cell ?? "").trim();
    if (!s) continue;
    const up = s.toUpperCase();
    if (up === "RP" || up === "RP." || up === "RP ") continue;
    if (/^[\d.,]+$/.test(s)) continue; // pure number
    return s;
  }
  return "";
}

function classify(description: string): {
  direction: OwnerTransferItem["direction"];
  purpose: OwnerTransferItem["purpose"];
} {
  const up = description.toUpperCase();
  if (up.includes("TOP UP") && (up.includes("PC") || up.includes("PETTY"))) {
    return { direction: "owner_to_branch", purpose: "petty_cash_topup" };
  }
  if (up.includes("INJEC") && (up.includes("PIUTANG") || up.includes("PELUNASAN"))) {
    return { direction: "owner_to_branch", purpose: "payable_payment_fund" };
  }
  if (up.includes("INJEC") || up.includes("INJECT")) {
    return { direction: "owner_to_branch", purpose: "adjustment" };
  }
  if (up.includes("SETOR") || up.includes("TRANSFER OWNER")) {
    return { direction: "branch_to_owner", purpose: "night_transfer" };
  }
  // Pergantian / TO JUAL / other revenue → keep as adjustment owner→branch
  // so it surfaces in transfers list without overstating sales.
  return { direction: "owner_to_branch", purpose: "adjustment" };
}

export function parseOwnerTransfers(
  wb: XLSX.WorkBook,
  fallbackDate: string,
): OwnerTransferItem[] {
  const sheetName = wb.SheetNames.find((n) => {
    const up = n.toUpperCase().replace(/\s+/g, " ").trim();
    return up.includes("LAP. CF") || up.includes("LAP CF") ||
           up.includes("CASH FLOW") || up.includes("LAPORAN CF");
  });
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);

  const result: OwnerTransferItem[] = [];
  let inOtherIncome = false;
  let inOtherExpense = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null)) continue;

    const firstCell = String(row[0] ?? row[1] ?? row[2] ?? "").toUpperCase().trim();
    if (firstCell.startsWith("NB") || firstCell.startsWith("CATATAN") || firstCell.startsWith("NOTE")) continue;

    // Section transitions
    if (rowContains(row, "PENERIMAAN") && rowContains(row, "LAIN")) {
      inOtherIncome = true;
      inOtherExpense = false;
      continue;
    }
    if (rowContains(row, "TOTAL")) {
      // Any total marks end of current sub-section
      inOtherIncome = false;
      inOtherExpense = false;
      continue;
    }
    if (rowContains(row, "PENGELUARAN") && rowContains(row, "LAIN")) {
      inOtherExpense = true;
      inOtherIncome = false;
      continue;
    }
    if (rowContains(row, "SALDO AKHIR")) {
      // End of meaningful sections
      inOtherIncome = false;
      inOtherExpense = false;
      continue;
    }
    // "Pengeluaran :" without LAIN is the daily-belanja section, not other.
    if (rowContains(row, "PENGELUARAN") && !rowContains(row, "LAIN")) {
      inOtherIncome = false;
      continue;
    }

    if (!inOtherIncome && !inOtherExpense) continue;

    const amount = findAmount(row);
    if (amount <= 0) continue;

    const description = findDescription(row);
    if (!description) continue;

    const cls = classify(description);
    // Override section direction if "Pengeluaran lain-lain"
    const direction = inOtherExpense ? "branch_to_owner" : cls.direction;
    const purpose = inOtherExpense
      ? (cls.purpose === "petty_cash_topup" ? "adjustment" : cls.purpose)
      : cls.purpose;

    result.push({
      transferDate: fallbackDate,
      direction,
      purpose,
      amount,
      referenceNo: `CF-R${i}`,
      description,
    });
  }

  return result;
}
