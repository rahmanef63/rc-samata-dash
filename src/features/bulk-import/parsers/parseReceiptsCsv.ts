// Bulk Bukti Bayar CSV parser. One row per payment receipt.
//
// Required columns:
//   paidDate         YYYY-MM-DD
//   amount           Rp number
//   paidBy           "owner" | "pic"
// Optional:
//   vendorName       (used to auto-resolve payableId by latest open)
//   channel          (cash | transfer | ewallet | other)
//   reference        (no transaksi)
//   notes
//   fileName         (original chat filename; saved as proofFileName even
//                     without the file upload step — file can be attached later)

import { parseRupiahLoose } from "@/features/daily-report-validation/lib/parsing";

export type ReceiptCsvRow = {
  paidDate: string;
  amount: number;
  paidBy: "owner" | "pic";
  vendorName?: string;
  channel?: string;
  reference?: string;
  notes?: string;
  fileName?: string;
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseReceiptsCsv(text: string): {
  rows: ReceiptCsvRow[];
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

  const required = ["paidDate", "amount", "paidBy"];
  const missing = required.filter((k) => !idx.has(normalize(k)));
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 0, message: `Kolom wajib hilang: ${missing.join(", ")}` }] };
  }

  const rows: ReceiptCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cells = parseCsvLine(lines[i]);
      const paidDate = get(cells, "paidDate");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
        errors.push({ line: i + 1, message: `paidDate "${paidDate}" bukan YYYY-MM-DD` });
        continue;
      }
      const amount = parseRupiahLoose(get(cells, "amount"));
      if (amount <= 0) {
        errors.push({ line: i + 1, message: "amount harus > 0" });
        continue;
      }
      const paidByRaw = get(cells, "paidBy").toLowerCase();
      const paidBy: "owner" | "pic" = paidByRaw === "pic" ? "pic" : "owner";

      rows.push({
        paidDate,
        amount,
        paidBy,
        vendorName: get(cells, "vendorName") || undefined,
        channel: get(cells, "channel") || undefined,
        reference: get(cells, "reference") || undefined,
        notes: get(cells, "notes") || undefined,
        fileName: get(cells, "fileName") || undefined,
      });
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : "Parse error" });
    }
  }

  return { rows, errors };
}

export function buildReceiptsCsvTemplate(): string {
  const header = ["paidDate", "amount", "paidBy", "vendorName", "channel", "reference", "notes", "fileName"];
  const today = new Date().toISOString().slice(0, 10);
  const examples = [
    [today, "1500000", "owner", "JAPFA INDONESIA", "transfer", "TRF-2026-001", "Bayar Japfa minggu ini", "TF-SUPPLIER_JapfaFoodIndonesia_29042026_15-00.jpg"],
    [today, "320000", "pic", "Sosro Sinar Gowa", "transfer", "", "Bayar Sosro mingguan", "TF-SUPPLIER_Sosro-SinarGowa_29042026_15-05.jpg"],
  ];
  return [header.join(","), ...examples.map((r) => r.join(","))].join("\n") + "\n";
}
