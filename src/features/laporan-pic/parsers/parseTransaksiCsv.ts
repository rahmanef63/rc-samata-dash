// Parse long-format laporan PIC CSV (CSV 2 — TRANSAKSI_VERIFIED).
//
// Header signature: paidDate, amount, paidBy, vendorName, channel,
// reference, notes, fileName
//
// paidBy enum (from real export):
//   pic     — PIC bayar dari kas / ATM langsung
//   pic2    — PIC bayar via transfer bank
//   vendor  — INI ROW INVOICE, bukan bayar (semantik ambigu sengaja)
//   other   — anomali (mislabel / duplikat / bukan transfer)

import { parseRupiahLoose } from "@/features/daily-report-validation/lib/parsing";
import { normalize, parseCsvLine, normalizeDate } from "../lib/csvShared";

export type TransaksiPaidBy = "pic" | "pic2" | "vendor" | "other";

export type TransaksiRow = {
  paidDate: string;
  amount: number;
  paidBy: TransaksiPaidBy;
  vendorName: string;
  channel?: string;
  reference?: string;
  notes?: string;
  fileName?: string;
};

const REQUIRED = ["paidDate", "amount", "paidBy", "vendorName"];

export function isTransaksiCsv(headerNormalized: string[]): boolean {
  const set = new Set(headerNormalized);
  return REQUIRED.every((k) => set.has(normalize(k)));
}

export function parseTransaksiCsv(text: string): {
  rows: TransaksiRow[];
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

  const rows: TransaksiRow[] = [];
  const errors: { line: number; message: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cells = parseCsvLine(lines[i]);
      const paidDate = normalizeDate(get(cells, "paidDate"));
      if (!paidDate) {
        errors.push({ line: i + 1, message: `paidDate "${get(cells, "paidDate")}" gak bisa diparse` });
        continue;
      }
      const amount = parseRupiahLoose(get(cells, "amount"));
      const paidByRaw = get(cells, "paidBy").toLowerCase();
      const paidBy: TransaksiPaidBy =
        paidByRaw === "pic" ? "pic" :
        paidByRaw === "pic2" ? "pic2" :
        paidByRaw === "vendor" ? "vendor" :
        "other";
      const vendorName = get(cells, "vendorName");

      rows.push({
        paidDate,
        amount,
        paidBy,
        vendorName,
        channel: get(cells, "channel") || undefined,
        reference: get(cells, "reference") || undefined,
        notes: get(cells, "notes") || undefined,
        fileName: get(cells, "fileName") || undefined,
      });
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : "row failed" });
    }
  }

  return { rows, errors };
}

// Classify a row into the target table at import time.
//
//   vendor                  → payable (this is the invoice line)
//   pic/pic2 + DZIKRULLAH-ish vendor name → ownerTransfer (branch_to_owner)
//   pic/pic2 + real vendor  → paymentReceipt (link to payable later)
//   other                   → paymentReceipt with anomalyFlag
//   amount === 0            → anomaly (not_transfer) regardless
export type Classification =
  | "payable"
  | "receipt"
  | "owner_transfer_to"        // branch → owner
  | "owner_transfer_from"      // owner → branch
  | "anomaly";

const OWNER_NAME_HINTS = [
  "dzikrullah", "setoran ke owner", "owner", "rahman",
];
const FROM_OWNER_HINTS = [
  "dari owner", "owner ke", "topup dari owner",
];

export function classifyTransaksi(row: TransaksiRow): {
  category: Classification;
  anomalyFlag?: "mislabel" | "duplicate" | "not_transfer" | "partial";
} {
  const v = row.vendorName.toLowerCase();
  const n = (row.notes ?? "").toLowerCase();

  if (row.paidBy === "other" || row.amount === 0) {
    if (n.includes("bukan transfer") || row.amount === 0) return { category: "anomaly", anomalyFlag: "not_transfer" };
    if (n.includes("duplikat")) return { category: "anomaly", anomalyFlag: "duplicate" };
    if (n.includes("mislabel")) return { category: "anomaly", anomalyFlag: "mislabel" };
    return { category: "anomaly" };
  }

  if (row.paidBy === "vendor") {
    return { category: "payable" };
  }

  // pic / pic2
  const isOwner = OWNER_NAME_HINTS.some((h) => v.includes(h));
  if (isOwner) {
    const fromOwner = FROM_OWNER_HINTS.some((h) => n.includes(h));
    return { category: fromOwner ? "owner_transfer_from" : "owner_transfer_to" };
  }

  // Real vendor payment — receipt
  const partial = n.includes("partial") || n.includes("sisa");
  return { category: "receipt", anomalyFlag: partial ? "partial" : undefined };
}
