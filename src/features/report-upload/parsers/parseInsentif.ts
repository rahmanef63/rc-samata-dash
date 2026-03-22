/**
 * Parser sheet "INSENTIF" — insentif karyawan.
 *
 * Struktur:
 *   Header row dengan: No, Nama, Jabatan/Type, Jumlah/Amount, Keterangan
 *   Data rows: satu baris per karyawan
 *   Stop di TOTAL/JUMLAH
 */

import { getSheetRows, toNumber } from "../lib/xlsxHelpers";
import type XLSX from "xlsx";

export type IncentiveItem = {
  employeeName: string;
  incentiveType: string;
  amount: number;
  notes?: string;
};

export function parseInsentif(wb: XLSX.WorkBook): IncentiveItem[] {
  const sheetName = wb.SheetNames.find((n) =>
    n.toUpperCase().includes("INSENTIF") || n.toUpperCase().includes("INCENTIVE")
  );
  if (!sheetName) return [];

  const rows = getSheetRows(wb, sheetName);
  const result: IncentiveItem[] = [];

  // Find header row
  let headerRowIdx = -1;
  const cols = { name: 1, type: 2, amount: 3, notes: 4 };

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    const cells = row.map((c) => String(c ?? "").toUpperCase().trim());
    const hasName = cells.some((c) => c.includes("NAMA") || c.includes("NAME"));
    const hasAmount = cells.some((c) => c.includes("JUMLAH") || c.includes("AMOUNT") || c.includes("NOMINAL"));

    if (hasName && hasAmount) {
      headerRowIdx = i;
      for (let c = 0; c < cells.length; c++) {
        const cell = cells[c];
        if (cell.includes("NAMA") || cell.includes("NAME")) cols.name = c;
        else if (cell.includes("JABATAN") || cell.includes("TYPE") || cell.includes("JENIS") || cell.includes("POSISI")) cols.type = c;
        else if (cell.includes("JUMLAH") || cell.includes("AMOUNT") || cell.includes("NOMINAL") || cell.includes("RP")) cols.amount = c;
        else if (cell.includes("KET") || cell.includes("NOTES") || cell.includes("CATATAN")) cols.notes = c;
      }
      break;
    }
  }

  // Fallback: start scanning from row 3 with assumed columns
  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 3;

  // Detect current incentive type section
  let currentType = "UMUM";

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const label = String(row[cols.name] ?? row[0] ?? "").trim();
    if (!label) continue;

    const upper = label.toUpperCase();
    if (upper.includes("TOTAL") || upper.includes("JUMLAH")) break;

    // Detect section headers (incentive type groups)
    const TYPE_KEYWORDS = [
      "PERFORMANCE", "KEHADIRAN", "ATTENDANCE", "LEMBUR", "OVERTIME",
      "BONUS", "THR", "TUNJANGAN", "TRANSPORT", "MAKAN",
    ];
    const isTypeHeader = TYPE_KEYWORDS.some((k) => upper.includes(k));
    const hasAmount = toNumber(row[cols.amount]) > 0;

    if (isTypeHeader && !hasAmount) {
      currentType = label;
      continue;
    }

    const amount = toNumber(row[cols.amount]);
    if (amount <= 0) continue;

    const employeeName = label;
    const incentiveType = String(row[cols.type] ?? "").trim() || currentType;
    const notes = cols.notes >= 0 ? String(row[cols.notes] ?? "").trim() : undefined;

    result.push({
      employeeName,
      incentiveType,
      amount,
      notes: notes || undefined,
    });
  }

  return result;
}
