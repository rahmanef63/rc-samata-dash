// Parse pivot-format laporan PIC CSV (CSV 1 — MATCH_PIUTANG_PEMBAYARAN).
//
// Each row = 1 piutang line + optional matched payment.
// Columns: Tanggal Piutang, Vendor, Nominal Piutang, Ref File PDF Name,
// Status Rekap, Match Status, Matched Payment Date, Matched Payment
// Amount, Matched Payment Vendor, Matched Payment File, Keterangan

import { parseRupiahLoose } from "@/features/daily-report-validation/lib/parsing";
import { normalize, parseCsvLine, normalizeDate } from "../lib/csvShared";

export type MatchPiutangRow = {
  invoiceDate: string;
  vendor: string;
  amount: number;
  refPdfFile?: string;
  statusRekap?: string;          // OK | PERLU_VERIFIKASI - ...
  matchStatus: "MATCH_EXACT" | "UNMATCHED" | string;
  paymentDate?: string;
  paymentAmount?: number;
  paymentVendor?: string;
  paymentFile?: string;
  keterangan?: string;
  splitTotal?: number;            // parsed from "split_from_vendor_total=X"
  splitNo?: string;               // "1/2"
};

const REQUIRED = ["TanggalPiutang", "Vendor", "NominalPiutang", "MatchStatus"];

export function isMatchPiutangCsv(headerNormalized: string[]): boolean {
  const set = new Set(headerNormalized);
  return REQUIRED.every((k) => set.has(normalize(k)));
}

function extractSplit(keterangan: string): { splitTotal?: number; splitNo?: string } {
  const totalM = keterangan.match(/split_from_vendor_total\s*=\s*(\d+)/i);
  const noM = keterangan.match(/split_no\s*=\s*(\d+\s*\/\s*\d+)/i);
  return {
    splitTotal: totalM ? Number(totalM[1]) : undefined,
    splitNo: noM ? noM[1].replace(/\s/g, "") : undefined,
  };
}

export function parseMatchPiutangCsv(text: string): {
  rows: MatchPiutangRow[];
  errors: { line: number; message: string }[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, message: "File kosong" }] };

  const header = parseCsvLine(lines[0]).map(normalize);
  const idx = new Map<string, number>();
  header.forEach((h, i) => idx.set(h, i));
  const get = (cells: string[], key: string): string => {
    const i = idx.get(normalize(key));
    return i !== undefined ? (cells[i] ?? "").trim() : "";
  };

  const missing = REQUIRED.filter((k) => !idx.has(normalize(k)));
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 0, message: `Kolom wajib hilang: ${missing.join(", ")}` }] };
  }

  const rows: MatchPiutangRow[] = [];
  const errors: { line: number; message: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cells = parseCsvLine(lines[i]);
      const invoiceDate = normalizeDate(get(cells, "TanggalPiutang"));
      if (!invoiceDate) {
        errors.push({ line: i + 1, message: `Tanggal Piutang "${get(cells, "TanggalPiutang")}" gagal diparse` });
        continue;
      }
      const amount = parseRupiahLoose(get(cells, "NominalPiutang"));
      if (amount <= 0) { errors.push({ line: i + 1, message: "Nominal Piutang harus > 0" }); continue; }
      const keterangan = get(cells, "Keterangan");
      const split = extractSplit(keterangan);
      const paymentDateRaw = get(cells, "MatchedPaymentDate");
      const paymentDate = paymentDateRaw ? normalizeDate(paymentDateRaw) ?? undefined : undefined;
      const paymentAmountRaw = get(cells, "MatchedPaymentAmount");
      const paymentAmount = paymentAmountRaw ? parseRupiahLoose(paymentAmountRaw) : undefined;
      rows.push({
        invoiceDate,
        vendor: get(cells, "Vendor"),
        amount,
        refPdfFile: get(cells, "RefFilePDFName") || undefined,
        statusRekap: get(cells, "StatusRekap") || undefined,
        matchStatus: get(cells, "MatchStatus"),
        paymentDate,
        paymentAmount,
        paymentVendor: get(cells, "MatchedPaymentVendor") || undefined,
        paymentFile: get(cells, "MatchedPaymentFile") || undefined,
        keterangan: keterangan || undefined,
        splitTotal: split.splitTotal,
        splitNo: split.splitNo,
      });
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : "row failed" });
    }
  }

  return { rows, errors };
}
