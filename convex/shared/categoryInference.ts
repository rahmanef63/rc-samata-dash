/**
 * Ingredient/expense category inference from item names.
 *
 * Used when an upload row has no category column (Weekly FC "Umum",
 * LeftOver, Vendor section blank) OR when LPKK "Lain-lain" can be
 * recovered from description/item-name keywords.
 *
 * Mirrors the labels seeded in DEFAULT_EXPENSE_CATEGORIES so each
 * inferred row binds 1-to-1 with a real expenseCategories._id.
 *
 * Order matters: more-specific keywords first (MINYAK before BERAS).
 */

export type CategoryType = "cogs" | "utility" | "other" | "bpjs" | "salary_support" | "maintenance" | "marketing" | "fee";

export type InferredCategory = {
  label: string;
  type: CategoryType;
};

type Rule = {
  pattern: RegExp;
  label: string;
  type: CategoryType;
};

const RULES: Rule[] = [
  // ─ COGS — bahan ayam ─
  { pattern: /\b(AYAM|PAHA|DADA|SAYAP|EKOR|FILLET|KEPALA AYAM|CEKER|HATI AMPELA|JEROAN|KARKAS|GIBLET)\b/, label: "Bahan Ayam", type: "cogs" },

  // ─ COGS — minyak ─
  { pattern: /\b(MINYAK|MARGARINE|MENTEGA|BUTTER|FORTUNE|BIMOLI)\b/, label: "Minyak Goreng", type: "cogs" },

  // ─ COGS — es ─
  { pattern: /\b(ES BATU|ES KRISTAL|ES KEMASAN|ICE)\b/, label: "Bahan Es", type: "cogs" },

  // ─ COGS — minuman ─
  { pattern: /\b(MILO|TEH|TEA|KOPI|COFFEE|SIRUP|SYRUP|JERUK|LEMON|SUSU KENTAL|FRESTEA|SPRITE|FANTA|COCA|PEPSI|JUS|SODA|MINUTE MAID|UC1000|POCARI|AQUA|LE MINERALE)\b/, label: "Bahan Minuman", type: "cogs" },

  // ─ COGS — pembungkus / kemasan ─
  { pattern: /\b(DUS|BOX|KEMASAN|PLASTIK|PAPER BAG|KANTONG|STYROFOAM|CUP|GELAS|SENDOK PLASTIK|STIK ES|SEDOTAN|TISSUE PEMBUNGKUS|WRAP|FOIL|PEMBUNGKUS)\b/, label: "Bahan Pembungkus", type: "cogs" },

  // ─ COGS — groceries / bumbu ─
  { pattern: /\b(BERAS|NASI|TEPUNG|TERIGU|GULA|GARAM|MERICA|LADA|KETUMBAR|JINTAN|KUNYIT|JAHE|LENGKUAS|SERAI|DAUN SALAM|BAWANG|CABE|CABAI|KECAP|SAMBAL|SAUS|MAYONNAISE|MAYO|SAOS|TOMAT|TIMUN|LADAKU|MASAKO|ROYCO|VETSIN|MSG|MICIN|TELUR|TELOR|MIE|SOUN|TAUGE|TAHU|TEMPE)\b/, label: "Groceries/Bumbu", type: "cogs" },

  // ─ COGS — pelengkap (sayur tambahan, daun, sambal jadi) ─
  { pattern: /\b(SAYUR|SAYURAN|KEMANGI|SELADA|KOL|KUBIS|WORTEL|KENTANG|JAGUNG|BUNCIS|KACANG PANJANG|PARE|TERONG|LABU)\b/, label: "Bahan Pelengkap", type: "cogs" },

  // ─ Utility — pembersih ─
  { pattern: /\b(SABUN|SUNLIGHT|DETERGEN|DETERGENT|HARPIC|BAYGON|PEMBERSIH|VIXAL|WIPOL|KARBOL|RINSO|MAMA LIME|SPONS|KAIN PEL|PEMUTIH|BAYCLIN)\b/, label: "Bahan Pembersih", type: "utility" },

  // ─ Utility — transport ─
  { pattern: /\b(BENSIN|SOLAR|PERTAMAX|PERTALITE|TRANSPORT|ANGKUT|ONGKOS KIRIM|GOJEK|GRAB EXPRESS|PARKIR|TOL)\b/, label: "Transport", type: "utility" },

  // ─ Other — ATK / foto copy ─
  { pattern: /\b(FOTO COPY|FOTOCOPY|FOTOKOPI|ATK|KERTAS|PULPEN|TINTA|STAPLER|MAP|AMPLOP|STEMPEL)\b/, label: "Foto Copy/ATK", type: "other" },

  // ─ BPJS ─
  { pattern: /\b(BPJS|JAMSOSTEK|JAMINAN KESEHATAN|JKN|KESEHATAN KARYAWAN)\b/, label: "BPJS", type: "bpjs" },

  // ─ Salary / insentif ─
  { pattern: /\b(GAJI|UPAH|HONOR|INSENTIF|BONUS KARYAWAN|TUNJANGAN|PESANGON|THR)\b/, label: "Insentif / Gaji", type: "salary_support" },

  // ─ Maintenance ─
  { pattern: /\b(SERVICE|REPAIR|PERBAIKAN|PEMELIHARAAN|MAINTENANCE|GAS LPG|TABUNG GAS|REGULATOR|SPARE PART|GANTI OLI|SERVIS AC|CUCI AC)\b/, label: "Maintenance", type: "maintenance" },

  // ─ Marketing ─
  { pattern: /\b(IKLAN|PROMO|MARKETING|FLYER|BANNER|SPANDUK|BROSUR|SOCIAL MEDIA|SOSMED|ENDORSE)\b/, label: "Marketing", type: "marketing" },

  // ─ Platform fees ─
  { pattern: /\b(KOMISI|FEE PLATFORM|GRAB FEE|GOFOOD FEE|SHOPEE FEE|MDR|BIAYA TRANSFER|BIAYA BANK|ADMIN BANK)\b/, label: "Platform Fee", type: "fee" },
];

/**
 * Returns inferred {label, type} for an item or description string.
 * Falls back to { label: "Lain-lain", type: "other" } if no rule matches.
 */
export function inferIngredientCategory(text: string): InferredCategory {
  const up = String(text ?? "").toUpperCase();
  if (!up.trim()) return { label: "Lain-lain", type: "other" };
  for (const rule of RULES) {
    if (rule.pattern.test(up)) return { label: rule.label, type: rule.type };
  }
  return { label: "Lain-lain", type: "other" };
}

/**
 * Check whether an inferred result is the fallback (i.e. nothing matched).
 */
export function isUncategorized(label: string): boolean {
  const up = label.toUpperCase().trim();
  return up === "LAIN-LAIN" || up === "UMUM" || up === "OTHER" || up === "";
}
