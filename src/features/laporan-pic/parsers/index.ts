// Auto-detect which laporan-pic CSV format the user uploaded.

import { parseCsvLine, normalize } from "../lib/csvShared";
import { parseTransaksiCsv, isTransaksiCsv, classifyTransaksi, type TransaksiRow, type Classification } from "./parseTransaksiCsv";
import { parseMatchPiutangCsv, isMatchPiutangCsv, type MatchPiutangRow } from "./parseMatchPiutangCsv";

export type LaporanPicParseResult =
  | { kind: "long"; rows: TransaksiRow[]; errors: { line: number; message: string }[] }
  | { kind: "pivot"; rows: MatchPiutangRow[]; errors: { line: number; message: string }[] }
  | { kind: "unknown"; errors: { line: number; message: string }[] };

export function parseLaporanPicCsv(text: string): LaporanPicParseResult {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const headerNorm = parseCsvLine(firstLine).map(normalize);
  if (isMatchPiutangCsv(headerNorm)) {
    const r = parseMatchPiutangCsv(text);
    return { kind: "pivot", ...r };
  }
  if (isTransaksiCsv(headerNorm)) {
    const r = parseTransaksiCsv(text);
    return { kind: "long", ...r };
  }
  return {
    kind: "unknown",
    errors: [{
      line: 0,
      message: "Format CSV tidak dikenali. Header harus berisi kolom dari format LONG (paidDate, amount, paidBy, vendorName) atau PIVOT (Tanggal Piutang, Vendor, Nominal Piutang, Match Status).",
    }],
  };
}

export { parseTransaksiCsv, parseMatchPiutangCsv, classifyTransaksi };
export type { TransaksiRow, MatchPiutangRow, Classification };
