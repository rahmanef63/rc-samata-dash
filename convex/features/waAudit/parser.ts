/**
 * WhatsApp daily SV report parser — regex-based extraction.
 *
 * Expected format (loose, banyak variant ditolerate):
 *
 *   LAPORAN HARIAN SV - 24 MEI 2026
 *   ABSEN:
 *     - SV1 (P)
 *     - Kasir 1 (P)
 *     - Cook 1 (L)
 *   ONLINE STATUS:
 *     - GoFood: ON
 *     - GrabFood: ON
 *     - ShopeeFood: OFF (problem app)
 *   SALES:
 *     - Tunai: Rp 1,250,000
 *     - Non Tunai: Rp 450,000
 *   PENGELUARAN:
 *     - Rp 280,000
 *
 * Returns partial structured data — UI can preview + override.
 */

export type WaParsed = {
  date?: string;              // YYYY-MM-DD
  sender?: string;            // detected from header
  salesCash?: number;
  salesNonCash?: number;
  expensesTotal?: number;
  gofoodNet?: number;
  grabNet?: number;
  shopeeNet?: number;
  posisi?: string;            // free-form posisi info
  parseWarnings: string[];
};

const MONTH_ID: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agustus: 8, aug: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12,
};

function normalizeRpAmount(s: string): number | undefined {
  // "Rp 1,250,000" / "1.250.000" / "1250000" / "Rp1.250rb"
  const cleaned = s.replace(/rp\s*/i, "").trim();
  if (/\d+rb\s*$/i.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/rb.*$/i, "").replace(/[.,]/g, ""));
    return num * 1000;
  }
  if (/\d+jt\s*$/i.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/jt.*$/i, "").replace(/[.,]/g, "."));
    return num * 1_000_000;
  }
  // Strip thousand separators (both . and ,) — assume Indonesian format
  const digits = cleaned.replace(/[.,\s]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseDateFromHeader(text: string): string | undefined {
  // Try "DD MMMM YYYY" or "DD MMM YYYY"
  const m1 = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m1) {
    const [, d, mo, y] = m1;
    const monthNum = MONTH_ID[mo.toLowerCase()];
    if (monthNum) {
      return `${y}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  // Try "YYYY-MM-DD" or "DD/MM/YYYY"
  const m2 = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  const m3 = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m3) {
    const [, d, mo, y] = m3;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return undefined;
}

function extractAmountAfterLabel(text: string, labels: string[]): number | undefined {
  for (const lbl of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*[-•·]?\\s*${lbl}\\s*[:\\-]?\\s*(rp\\s*)?([\\d.,]+(?:rb|jt)?)`,
      "im",
    );
    const m = text.match(re);
    if (m) {
      const v = normalizeRpAmount(m[2]);
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

export function parseWaReport(rawText: string): WaParsed {
  const warnings: string[] = [];

  const date = parseDateFromHeader(rawText);
  if (!date) warnings.push("Tanggal tidak terdeteksi — set manual.");

  // Sender = first capitalized name in header line "SV1" / "SPV" etc.
  let sender: string | undefined;
  const headerLine = rawText.split("\n").find((l) => /sv|spv|supervisor|kasir/i.test(l));
  if (headerLine) {
    const m = headerLine.match(/([A-Z][A-Za-z0-9\s]+(?:SV|SPV|\d+))/);
    if (m) sender = m[1].trim();
  }

  const salesCash = extractAmountAfterLabel(rawText, ["tunai", "cash", "kas"]);
  const salesNonCash = extractAmountAfterLabel(rawText, ["non\\s*tunai", "non\\s*cash", "transfer", "qris"]);
  const expensesTotal = extractAmountAfterLabel(rawText, ["pengeluaran", "expense", "belanja", "biaya"]);
  const gofoodNet = extractAmountAfterLabel(rawText, ["gofood", "go\\s*food", "go-food"]);
  const grabNet = extractAmountAfterLabel(rawText, ["grab", "grabfood", "grab\\s*food"]);
  const shopeeNet = extractAmountAfterLabel(rawText, ["shopee", "shopeefood", "shopee\\s*food"]);

  if (salesCash === undefined && salesNonCash === undefined) {
    warnings.push("Tidak terdeteksi penjualan tunai/non-tunai.");
  }

  // Posisi free-form — ambil section setelah keyword
  let posisi: string | undefined;
  const posMatch = rawText.match(/(?:posisi|status|absen|kondisi)[\s:]*([\s\S]{0,500})/i);
  if (posMatch) {
    posisi = posMatch[1].trim().slice(0, 400);
  }

  return {
    date,
    sender,
    salesCash,
    salesNonCash,
    expensesTotal,
    gofoodNet,
    grabNet,
    shopeeNet,
    posisi,
    parseWarnings: warnings,
  };
}
