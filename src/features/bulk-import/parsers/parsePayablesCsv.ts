// Bulk Penagihan Piutang CSV parser. One row per supplier invoice.
//
// Required columns:
//   vendorName       (resolved to vendorId via vendor master; fuzzy match)
//   invoiceDate      YYYY-MM-DD
//   amount           Rp number
// Optional:
//   dueDate          YYYY-MM-DD (default: invoiceDate + 7 days)
//   description      Catatan / item ringkas
//   paidAmount       (jika sudah ada sebagian dibayar)
//   reference        (no nota)
//   fileName         original chat filename (saved as note attachment)

import { parseRupiahLoose } from "@/features/daily-report-validation/lib/parsing";

export type PayableCsvRow = {
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  description: string;
  reference?: string;
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

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parsePayablesCsv(text: string): {
  rows: PayableCsvRow[];
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

  const required = ["vendorName", "invoiceDate", "amount"];
  const missing = required.filter((k) => !idx.has(normalize(k)));
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 0, message: `Kolom wajib hilang: ${missing.join(", ")}` }] };
  }

  const rows: PayableCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cells = parseCsvLine(lines[i]);
      const vendorName = get(cells, "vendorName");
      if (!vendorName) { errors.push({ line: i + 1, message: "vendorName kosong" }); continue; }
      const invoiceDate = get(cells, "invoiceDate");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
        errors.push({ line: i + 1, message: `invoiceDate "${invoiceDate}" bukan YYYY-MM-DD` });
        continue;
      }
      const amount = parseRupiahLoose(get(cells, "amount"));
      if (amount <= 0) { errors.push({ line: i + 1, message: "amount harus > 0" }); continue; }
      const dueRaw = get(cells, "dueDate");
      const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : addDays(invoiceDate, 7);
      const paidAmount = parseRupiahLoose(get(cells, "paidAmount"));
      rows.push({
        vendorName,
        invoiceDate,
        dueDate,
        amount,
        paidAmount: Math.min(amount, Math.max(0, paidAmount)),
        description: get(cells, "description") || "",
        reference: get(cells, "reference") || undefined,
        fileName: get(cells, "fileName") || undefined,
      });
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : "Parse error" });
    }
  }

  return { rows, errors };
}

export function buildPayablesCsvTemplate(): string {
  const header = ["vendorName", "invoiceDate", "dueDate", "amount", "paidAmount", "description", "reference", "fileName"];
  const today = new Date().toISOString().slice(0, 10);
  const examples = [
    ["JAPFA INDONESIA", today, "", "1500000", "0", "Pembelian ayam 100kg", "INV-2026-001", "00000945-Update piutang 8-14 April 2026.pdf"],
    ["Sosro Sinar Gowa", today, "", "320000", "0", "Minuman botol", "INV-2026-002", "00001065-Nota tanggal 22-30 April 2026.pdf"],
  ];
  return [header.join(","), ...examples.map((r) => r.join(","))].join("\n") + "\n";
}
