// Parse RC Samata WhatsApp/chat filename conventions into structured
// metadata that downstream CSV scaffolding can consume.
//
// Supported patterns (case-insensitive):
//   1. <chatId>-<description>.<ext>
//        e.g. "00000945-Update piutang 8-14 April 2026 18.05.pdf"
//        e.g. "00000965-Laporan Keuangan 08 Apr 2026 - 14 Apr 2026.xls"
//        e.g. "00000966-Nota tgl 8-14 Maret 2026(2).pdf"
//   2. <typeCode>_<sub>_<DDMMYYYY>_<HH-MM>[_NN].<ext>
//        e.g. "STRUK-ATM_TF-Owner-Dzikrullah_29042026_20-01.jpg"
//        e.g. "TF-SUPPLIER_CiomasAdisatwa_01012026_05-03.jpg"
//        e.g. "TF-PIUTANG_Piutang-Supplier_13042026_21-15.jpg"
//        e.g. "TF-ROYALTI_RocketChickenSamata_22012026_07-18.jpg"
//        e.g. "TF-GAJI_DioBagusSetiawan_05012026_16-44.jpg"
//        e.g. "BANNER-PROMO_Promo-Ramadhan_25012026_15-12.jpg"
//        e.g. "FOTO-MASALAH_Kerusakan-Outlet_13022026_15-45.jpg"
//        e.g. "LAPORAN-ONLINE_GoFood-Shopee-Harian_01012026_08-45.jpg"
//   3. Free-form (fallback) — keep as "other"

export type FilenameCategory =
  | "struk_atm"         // STRUK-ATM_*
  | "tf_supplier"       // TF-SUPPLIER_*
  | "tf_piutang"        // TF-PIUTANG_*
  | "tf_royalti"        // TF-ROYALTI_*
  | "tf_gaji"           // TF-GAJI_*
  | "banner_promo"      // BANNER-PROMO_*
  | "foto_masalah"      // FOTO-MASALAH_*
  | "laporan_online"    // LAPORAN-ONLINE_*
  | "update_piutang"    // "Update piutang ..."
  | "nota"              // "Nota tgl ..."
  | "laporan_keuangan"  // "Laporan Keuangan ..."
  | "daftar_gaji"       // "DAFTAR GAJI ..."
  | "other";

export type ParsedFilename = {
  raw: string;
  category: FilenameCategory;
  vendor?: string;          // e.g. "CiomasAdisatwa", "JapfaFoodIndonesia"
  employee?: string;        // e.g. "DioBagusSetiawan" (tf_gaji)
  ownerName?: string;       // e.g. "Dzikrullah" (struk_atm)
  date?: string;            // YYYY-MM-DD
  time?: string;            // HH:MM
  period?: { start: string; end: string };  // for update_piutang / nota / laporan_keuangan
  ext: string;
  chatId?: string;          // 8-digit chat prefix when present
  description?: string;     // human-readable description leftover
};

const TYPE_PATTERNS: { match: RegExp; category: FilenameCategory }[] = [
  { match: /^STRUK-ATM_/i,        category: "struk_atm" },
  { match: /^TF-SUPPLIER_/i,      category: "tf_supplier" },
  { match: /^TF-PIUTANG_/i,       category: "tf_piutang" },
  { match: /^TF-ROYALTI_/i,       category: "tf_royalti" },
  { match: /^TF-GAJI_/i,          category: "tf_gaji" },
  { match: /^BANNER-PROMO_/i,     category: "banner_promo" },
  { match: /^FOTO-MASALAH_/i,     category: "foto_masalah" },
  { match: /^LAPORAN-ONLINE_/i,   category: "laporan_online" },
];

const ID_MONTHS_SHORT: Record<string, string> = {
  jan: "01", januari: "01",
  feb: "02", februari: "02",
  mar: "03", maret: "03",
  apr: "04", april: "04",
  mei: "05", may: "05",
  jun: "06", juni: "06",
  jul: "07", juli: "07",
  agu: "08", agt: "08", aug: "08", agustus: "08",
  sep: "09", september: "09",
  okt: "10", oct: "10", oktober: "10",
  nov: "11", november: "11",
  des: "12", dec: "12", desember: "12",
};

function ddmmyyyy(s: string): string | null {
  // "29042026" → "2026-04-29"
  if (s.length !== 8) return null;
  const dd = s.slice(0, 2);
  const mm = s.slice(2, 4);
  const yyyy = s.slice(4, 8);
  return /^\d{8}$/.test(s) ? `${yyyy}-${mm}-${dd}` : null;
}

function buildIdDate(day: string, monthKey: string, year: string): string | null {
  const k = monthKey.toLowerCase();
  const mm = ID_MONTHS_SHORT[k] ?? ID_MONTHS_SHORT[k.slice(0, 3)];
  if (!mm) return null;
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

function extractDateRange(s: string): { start: string; end: string } | undefined {
  // "8-14 April 2026" / "08 Apr 2026 - 14 Apr 2026" / "1-7 mei 2026"
  // / "22-30 April 2026"
  const m1 = s.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  if (m1) {
    const start = buildIdDate(m1[1], m1[3], m1[4]);
    const end = buildIdDate(m1[2], m1[3], m1[4]);
    if (start && end) return { start, end };
  }
  const m2 = s.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  if (m2) {
    const start = buildIdDate(m2[1], m2[2], m2[3]);
    const end = buildIdDate(m2[4], m2[5], m2[6]);
    if (start && end) return { start, end };
  }
  return undefined;
}

function extractSingleDate(s: string): string | undefined {
  // "29 April 2026" / "29-mei-2026" / "29 mei 2026"
  const m = s.match(/(\d{1,2})[\s-]+([a-z]+)[\s-]+(\d{4})/i);
  if (m) {
    const d = buildIdDate(m[1], m[2], m[3]);
    if (d) return d;
  }
  // "29042026" all digits → DDMMYYYY
  const m2 = s.match(/\b(\d{8})\b/);
  if (m2) {
    const d = ddmmyyyy(m2[1]);
    if (d) return d;
  }
  // "18426" / "27426" → likely shorthand "1-8-4-26" / "2-7-4-26" (DDM-Y) — skip
  return undefined;
}

const CHAT_PREFIX = /^(\d{8})-(.+)$/;
const TYPE_FILENAME = /^([A-Z][A-Z-]+)_([A-Za-z0-9-]+)_(\d{8})_(\d{2}-\d{2})(?:_(\d+))?\.([a-z]+)$/i;

export function parseFilename(filename: string): ParsedFilename {
  const trimmed = filename.trim();
  const extMatch = trimmed.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch?.[1].toLowerCase() ?? "";

  // Type-prefixed pattern
  const t = trimmed.match(TYPE_FILENAME);
  if (t) {
    const typeCode = t[1].toUpperCase();
    const sub = t[2];
    const dateStr = t[3];
    const timeStr = t[4].replace("-", ":");
    const date = ddmmyyyy(dateStr) ?? undefined;
    let category: FilenameCategory = "other";
    for (const p of TYPE_PATTERNS) {
      if (p.match.test(trimmed)) { category = p.category; break; }
    }

    const out: ParsedFilename = { raw: filename, category, ext, date, time: timeStr };
    if (category === "tf_supplier" || category === "tf_royalti") out.vendor = sub;
    else if (category === "tf_gaji") out.employee = sub;
    else if (category === "struk_atm") {
      // sub usually "TF-Owner-Dzikrullah" → ownerName = last segment
      const parts = sub.split("-");
      out.ownerName = parts[parts.length - 1];
    } else if (category === "tf_piutang") {
      out.description = sub;
    } else {
      out.description = sub;
    }
    // typeCode unused beyond category — silence ts
    void typeCode;
    return out;
  }

  // Chat-prefixed pattern
  const c = trimmed.match(CHAT_PREFIX);
  if (c) {
    const chatId = c[1];
    const desc = c[2].replace(/\.[a-z0-9]+$/i, "");
    let category: FilenameCategory = "other";
    if (/update\s+piutang/i.test(desc)) category = "update_piutang";
    else if (/^nota/i.test(desc)) category = "nota";
    else if (/laporan\s+keuangan/i.test(desc)) category = "laporan_keuangan";
    else if (/daftar\s+gaji|store\s+mitra/i.test(desc)) category = "daftar_gaji";
    return {
      raw: filename,
      chatId,
      category,
      ext,
      description: desc,
      date: extractSingleDate(desc),
      period: extractDateRange(desc),
    };
  }

  return { raw: filename, category: "other", ext, description: trimmed.replace(/\.[a-z0-9]+$/i, "") };
}

// ─── Label helpers for UI ───────────────────────────────────

export const FILENAME_CATEGORY_LABELS: Record<FilenameCategory, string> = {
  struk_atm: "Struk ATM (Setor Owner)",
  tf_supplier: "Bayar Supplier",
  tf_piutang: "Bayar Piutang Supplier",
  tf_royalti: "Bayar Royalti",
  tf_gaji: "Bayar Gaji",
  banner_promo: "Banner Promo",
  foto_masalah: "Foto Masalah Outlet",
  laporan_online: "Laporan Online",
  update_piutang: "Update Piutang (tagihan)",
  nota: "Nota Penagihan",
  laporan_keuangan: "Laporan Keuangan",
  daftar_gaji: "Daftar Gaji",
  other: "Lain-lain",
};

// Which categories map to payment-receipt bulk-import vs payable bulk-import?
export const RECEIPT_CATEGORIES = new Set<FilenameCategory>([
  "tf_supplier", "tf_piutang", "tf_royalti", "tf_gaji", "struk_atm",
]);

export const PAYABLE_INVOICE_CATEGORIES = new Set<FilenameCategory>([
  "update_piutang", "nota", "laporan_keuangan",
]);

export const REFERENCE_CATEGORIES = new Set<FilenameCategory>([
  "banner_promo", "foto_masalah", "laporan_online",
]);
