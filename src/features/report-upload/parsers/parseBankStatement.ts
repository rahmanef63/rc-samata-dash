/**
 * Parser bank statement (PIC / Owner) — format "Detail Transaksi Gabungan"
 * yang sudah di-clean + dilabeli per row (Kategori + Pihak columns).
 *
 * Strategi:
 *   1. Scan all sheets, cari row yang berisi header detail
 *      (No, Bulan, Tanggal, Kategori, Debit, Kredit).
 *   2. Data row = row dengan No numerik di col 0.
 *   3. Tanggal "DD/MM" + Bulan (FEB/MAR/...) → YYYY-MM-DD pakai
 *      `yearHint` dari periodStart UI.
 *   4. Skip "Saldo Awal" row (no money movement).
 */

import { getSheetRows, toNumber, type RawSheet } from "../lib/xlsxHelpers";
import {
  BANK_STATEMENT_CATEGORY_MAP,
  BANK_STATEMENT_CHANNEL_HINTS,
} from "../../../../convex/shared/uploadSchemas";
import type XLSX from "xlsx";

export type BankStatementRow = {
  txDate: string;            // YYYY-MM-DD
  description: string;
  jenisTransaksi: string;
  kategoriRaw: string;
  pihak: string;
  debit: number;
  kredit: number;
  balance: number;
  net: number;
  catatan?: string;
  category: "sales_inflow" | "expense_outflow" | "topup_pic" | "payable_payment" | "owner_capital" | "transfer_internal" | "other";
  channel?: string;
};

const MONTH_MAP: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MEI: "05", MAY: "05",
  JUN: "06", JUL: "07", AGU: "08", AUG: "08", SEP: "09",
  OKT: "10", OCT: "10", NOV: "11", DES: "12", DEC: "12",
};

function isDetailHeader(row: RawSheet[0]): boolean {
  const upper = row.map((c) => String(c ?? "").toUpperCase().trim());
  return (
    upper.includes("NO") &&
    (upper.includes("BULAN") || upper.includes("TANGGAL")) &&
    upper.includes("KATEGORI") &&
    upper.includes("DEBIT") &&
    upper.includes("KREDIT")
  );
}

function mapMonth(bulan: string): string | null {
  const key = bulan.trim().toUpperCase().slice(0, 3);
  return MONTH_MAP[key] ?? null;
}

function parseDate(tanggal: string, bulan: string, yearHint: number): string | null {
  // "DD/MM" format
  const m = String(tanggal).trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  // Use bulan column for authoritative month (defensive)
  const monthFromBulan = mapMonth(bulan);
  const finalMonth = monthFromBulan ?? mm;
  return `${yearHint}-${finalMonth}-${dd}`;
}

function inferCategory(kategoriRaw: string, pihak: string): BankStatementRow["category"] {
  const map = BANK_STATEMENT_CATEGORY_MAP[kategoriRaw.trim()];
  if (!map) return "other";
  if (map.pihakHints) {
    const pUp = pihak.toUpperCase().trim();
    for (const [hint, cat] of Object.entries(map.pihakHints)) {
      if (pUp.includes(hint.toUpperCase())) return cat as BankStatementRow["category"];
    }
  }
  return map.category as BankStatementRow["category"];
}

function inferChannel(pihak: string, kategori: string, jenis: string): string | undefined {
  const haystack = `${pihak} ${kategori} ${jenis}`;
  for (const { match, channel } of BANK_STATEMENT_CHANNEL_HINTS) {
    if (match.test(haystack)) return channel;
  }
  return undefined;
}

export function parseBankStatement(wb: XLSX.WorkBook, yearHint: number): BankStatementRow[] {
  for (const sheetName of wb.SheetNames) {
    const rows = getSheetRows(wb, sheetName);
    // find detail header
    const headerIdx = rows.findIndex(isDetailHeader);
    if (headerIdx < 0) continue;

    const result: BankStatementRow[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 11) continue;

      const no = toNumber(row[0]);
      if (no <= 0) continue;

      const bulan = String(row[1] ?? "").trim();
      const tanggal = String(row[2] ?? "").trim();
      const jenis = String(row[5] ?? "").trim();
      const kategori = String(row[6] ?? "").trim();
      const pihak = String(row[7] ?? "").trim();
      const ket = String(row[8] ?? "").trim();
      const debit = toNumber(row[9]);
      const kredit = toNumber(row[10]);
      const net = row[11] !== undefined && row[11] !== "" ? toNumber(row[11]) : kredit - debit;
      const saldo = toNumber(row[12]);
      const catatan = row[13] ? String(row[13]).trim() : undefined;

      // Skip "Saldo Awal" rows — no money movement
      if (kategori.toUpperCase().includes("SALDO AWAL")) continue;
      // Skip rows with no money
      if (debit === 0 && kredit === 0) continue;

      const txDate = parseDate(tanggal, bulan, yearHint);
      if (!txDate) continue;

      const category = inferCategory(kategori, pihak);
      const channel = inferChannel(pihak, kategori, jenis);

      result.push({
        txDate,
        description: ket || `${jenis} ${pihak}`.trim(),
        jenisTransaksi: jenis,
        kategoriRaw: kategori,
        pihak,
        debit,
        kredit,
        balance: saldo,
        net,
        catatan,
        category,
        channel,
      });
    }
    return result;
  }
  return [];
}
