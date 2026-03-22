/**
 * Parser sheet "LAP. CF" — Laporan Cash Flow harian.
 *
 * Struktur mirip LAPORAN KAS PERIODE:
 *   - Row tertentu: tanggal (7 kolom = 7 hari)
 *   - Row label-based: SALDO AWAL, PENJUALAN/PEMASUKAN, PENGELUARAN, SALDO AKHIR
 *
 * Output: satu record per hari dengan opening balance, inflow, outflow, closing balance.
 */

import { getSheetRows, toNumber, toDateString } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type DailyCashFlowItem = {
  businessDate: string;
  openingBalance: number;
  salesInflow: number;
  otherInflow: number;
  expenseOutflow: number;
  otherOutflow: number;
  closingBalance: number;
};

export function parseLapCF(wb: XLSX.WorkBook): DailyCashFlowItem[] {
  const sheetName = wb.SheetNames.find((n) => {
    const up = n.toUpperCase().replace(/\s+/g, " ").trim();
    return up.includes("LAP. CF") || up.includes("LAP CF") ||
           up.includes("CASH FLOW") || up.includes("LAPORAN CF");
  });
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: DailyCashFlowItem[] = [];

  // Find date row first
  let dateRowIdx = -1;
  let dateColStart = -1;
  let dateColEnd = -1;
  const dates: (string | null)[] = [];

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    for (let c = 1; c < Math.min(row.length, 15); c++) {
      const d = toDateString(row[c]);
      if (d) {
        if (dateRowIdx < 0) {
          dateRowIdx = i;
          dateColStart = c;
        }
        dateColEnd = c;
        dates.push(d);
      } else if (dateRowIdx === i && dates.length > 0) {
        // Stop collecting dates if we hit a non-date in the same row
        break;
      }
    }
    if (dates.length > 0 && dateRowIdx !== i) break;
  }

  if (dates.length === 0) return [];

  const numDays = dates.length;

  // Initialize daily records
  const daily: Record<string, {
    openingBalance: number; salesInflow: number; otherInflow: number;
    expenseOutflow: number; otherOutflow: number; closingBalance: number;
  }> = {};
  for (const d of dates) {
    if (d) {
      daily[d] = {
        openingBalance: 0, salesInflow: 0, otherInflow: 0,
        expenseOutflow: 0, otherOutflow: 0, closingBalance: 0,
      };
    }
  }

  // Parse label rows
  for (let i = dateRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row[0] ?? row[1] ?? "").toUpperCase().trim();
    if (!label) continue;

    // Determine what this row represents
    let field: keyof typeof daily[string] | null = null;

    if (label.includes("SALDO AWAL") || label.includes("OPENING")) {
      field = "openingBalance";
    } else if (label.includes("SALDO AKHIR") || label.includes("CLOSING")) {
      field = "closingBalance";
    } else if (label.includes("PENJUALAN") || label.includes("SALES") || label.includes("PEMASUKAN")) {
      field = "salesInflow";
    } else if (label.includes("PENGELUARAN") || label.includes("EXPENSE") || label.includes("BIAYA")) {
      field = "expenseOutflow";
    } else if (label.includes("LAIN") && label.includes("MASUK")) {
      field = "otherInflow";
    } else if (label.includes("LAIN") && (label.includes("KELUAR") || label.includes("OUT"))) {
      field = "otherOutflow";
    } else if (label.includes("TRANSFER") || label.includes("SETORAN")) {
      field = "otherOutflow";
    } else if (label.includes("TOTAL") || label.includes("JUMLAH")) {
      continue;
    }

    if (!field) continue;

    // Extract values from date columns
    for (let d = 0; d < numDays; d++) {
      const colIdx = dateColStart + d;
      const val = toNumber(row[colIdx]);
      const date = dates[d];
      if (date && daily[date]) {
        daily[date][field] = val;
      }
    }
  }

  // Build result array
  for (const d of dates) {
    if (!d || !daily[d]) continue;
    const rec = daily[d];

    // Compute closing if not found: opening + inflow - outflow
    if (rec.closingBalance === 0 && rec.openingBalance > 0) {
      rec.closingBalance = rec.openingBalance + rec.salesInflow + rec.otherInflow
        - rec.expenseOutflow - rec.otherOutflow;
    }

    // Skip days with no data
    if (rec.openingBalance === 0 && rec.salesInflow === 0 && rec.closingBalance === 0) continue;

    result.push({
      businessDate: d,
      ...rec,
    });
  }

  return result;
}
