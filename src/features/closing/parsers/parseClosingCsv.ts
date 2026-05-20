// Parse daily closing CSV exported from WhatsApp summaries or
// staff-maintained sheet. One row = one businessDate.
//
// Required columns (header row, case-insensitive, dash/space ignored):
//   businessDate     (YYYY-MM-DD)
//   openingCash      (Rp number)
//   cashSales        (Rp number)
//   nonCashSales     (Rp number)
//   expensesPaidCash (Rp number)
//   actualCash       (Rp number)
//
// Optional:
//   gofood / grabfood / shopeefood / ovo / dana / qris (channel breakdown)
//   customerCount
//   note

export type ClosingCsvRow = {
  businessDate: string;
  openingCash: number;
  cashSales: number;
  nonCashSales: number;
  expensesPaidCash: number;
  actualCash: number;
  expectedCash: number;
  difference: number;
  channels: Partial<Record<"gofood" | "grabfood" | "shopeefood" | "ovo" | "dana" | "qris", number>>;
  customerCount?: number;
  note?: string;
};

const REQUIRED = [
  "businessDate", "openingCash", "cashSales", "nonCashSales",
  "expensesPaidCash", "actualCash",
] as const;

const CHANNEL_KEYS = ["gofood", "grabfood", "shopeefood", "ovo", "dana", "qris"] as const;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]/g, "");
}

function parseRupiah(raw: string): number {
  if (!raw) return 0;
  // Strip "Rp", separators, but preserve decimal dot/comma. Indonesian
  // export sometimes uses "." as thousands separator and "," as decimal.
  const cleaned = raw.replace(/rp/gi, "").replace(/\s/g, "");
  // Heuristic: if both "." and "," present, "," is decimal (id-ID).
  // Else strip non-digits.
  if (cleaned.includes(".") && cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(cleaned.replace(/[^\d-]/g, "")) || 0;
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

export function parseClosingCsv(text: string): {
  rows: ClosingCsvRow[];
  errors: { line: number; message: string }[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, message: "File kosong" }] };

  const header = parseCsvLine(lines[0]).map(normalize);
  const colIdx = new Map<string, number>();
  header.forEach((h, i) => colIdx.set(h, i));

  const missing = REQUIRED.filter((req) => !colIdx.has(normalize(req)));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ line: 0, message: `Kolom wajib hilang: ${missing.join(", ")}` }],
    };
  }

  const rows: ClosingCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const cells = parseCsvLine(lines[i]);
      const get = (key: string): string => {
        const idx = colIdx.get(normalize(key));
        return idx !== undefined ? (cells[idx] ?? "").trim() : "";
      };

      const businessDate = get("businessDate");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
        errors.push({ line: i + 1, message: `businessDate "${businessDate}" bukan format YYYY-MM-DD` });
        continue;
      }

      const openingCash = parseRupiah(get("openingCash"));
      const cashSales = parseRupiah(get("cashSales"));
      const nonCashSales = parseRupiah(get("nonCashSales"));
      const expensesPaidCash = parseRupiah(get("expensesPaidCash"));
      const actualCash = parseRupiah(get("actualCash"));
      const expectedCash = openingCash + cashSales - expensesPaidCash;
      const difference = actualCash - expectedCash;

      const channels: ClosingCsvRow["channels"] = {};
      for (const ck of CHANNEL_KEYS) {
        const raw = get(ck);
        if (raw) channels[ck] = parseRupiah(raw);
      }

      const customerRaw = get("customerCount");
      const customerCount = customerRaw ? Number(customerRaw.replace(/[^\d]/g, "")) || undefined : undefined;

      rows.push({
        businessDate,
        openingCash, cashSales, nonCashSales, expensesPaidCash,
        actualCash, expectedCash, difference,
        channels,
        customerCount,
        note: get("note") || undefined,
      });
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : "Parse error" });
    }
  }

  return { rows, errors };
}

export function buildClosingCsvTemplate(): string {
  const header = [
    "businessDate", "openingCash", "cashSales", "nonCashSales",
    "expensesPaidCash", "actualCash",
    "gofood", "grabfood", "shopeefood", "ovo", "dana", "qris",
    "customerCount", "note",
  ];
  const today = new Date().toISOString().slice(0, 10);
  const example = [
    today, "500000", "1404929", "2471704", "120000", "1500000",
    "133273", "420360", "84000", "1834071", "0", "0",
    "118", "Contoh: minggu LIBUR",
  ];
  return header.join(",") + "\n" + example.join(",") + "\n";
}
