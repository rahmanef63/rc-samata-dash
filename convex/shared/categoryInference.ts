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

import { normalizeAlias } from "./normalize";

export type CategoryType = "cogs" | "utility" | "other" | "bpjs" | "salary_support" | "maintenance" | "marketing" | "fee";

export type InferredCategory = {
  label: string;
  type: CategoryType;
};

export type Rule = {
  keywords: string[];
  label: string;
  type: CategoryType;
};

/**
 * Inference rules — order matters (more specific first). Exposed as data
 * so the upload-time AI guide dialog can render the exact same rule set
 * the bridge uses, eliminating drift between docs and runtime behavior.
 */
export const INFERENCE_RULES: Rule[] = [
  { keywords: ["AYAM","PAHA","DADA","SAYAP","EKOR","FILLET","KEPALA AYAM","CEKER","HATI AMPELA","JEROAN","KARKAS","GIBLET"], label: "Bahan Ayam", type: "cogs" },
  { keywords: ["MINYAK","MARGARINE","MENTEGA","BUTTER","FORTUNE","BIMOLI"], label: "Minyak Goreng", type: "cogs" },
  { keywords: ["ES BATU","ES KRISTAL","ES KEMASAN","ICE"], label: "Bahan Es", type: "cogs" },
  { keywords: ["MILO","TEH","TEA","KOPI","COFFEE","SIRUP","SYRUP","JERUK","LEMON","SUSU KENTAL","FRESTEA","SPRITE","FANTA","COCA","PEPSI","JUS","SODA","MINUTE MAID","UC1000","POCARI","AQUA","LE MINERALE"], label: "Bahan Minuman", type: "cogs" },
  { keywords: ["DUS","BOX","KEMASAN","PLASTIK","PAPER BAG","KANTONG","STYROFOAM","CUP","GELAS","SENDOK PLASTIK","STIK ES","SEDOTAN","TISSUE PEMBUNGKUS","WRAP","FOIL","PEMBUNGKUS"], label: "Bahan Pembungkus", type: "cogs" },
  { keywords: ["BERAS","NASI","TEPUNG","TERIGU","GULA","GARAM","MERICA","LADA","KETUMBAR","JINTAN","KUNYIT","JAHE","LENGKUAS","SERAI","DAUN SALAM","BAWANG","CABE","CABAI","KECAP","SAMBAL","SAUS","MAYONNAISE","MAYO","SAOS","TOMAT","TIMUN","LADAKU","MASAKO","ROYCO","VETSIN","MSG","MICIN","TELUR","TELOR","MIE","SOUN","TAUGE","TAHU","TEMPE"], label: "Groceries/Bumbu", type: "cogs" },
  { keywords: ["SAYUR","SAYURAN","KEMANGI","SELADA","KOL","KUBIS","WORTEL","KENTANG","JAGUNG","BUNCIS","KACANG PANJANG","PARE","TERONG","LABU"], label: "Bahan Pelengkap", type: "cogs" },
  { keywords: ["SABUN","SUNLIGHT","DETERGEN","DETERGENT","HARPIC","BAYGON","PEMBERSIH","VIXAL","WIPOL","KARBOL","RINSO","MAMA LIME","SPONS","KAIN PEL","PEMUTIH","BAYCLIN"], label: "Bahan Pembersih", type: "utility" },
  { keywords: ["BENSIN","SOLAR","PERTAMAX","PERTALITE","TRANSPORT","ANGKUT","ONGKOS KIRIM","GOJEK","GRAB EXPRESS","PARKIR","TOL"], label: "Transport", type: "utility" },
  { keywords: ["FOTO COPY","FOTOCOPY","FOTOKOPI","ATK","KERTAS","PULPEN","TINTA","STAPLER","MAP","AMPLOP","STEMPEL"], label: "Foto Copy/ATK", type: "other" },
  { keywords: ["BPJS","JAMSOSTEK","JAMINAN KESEHATAN","JKN","KESEHATAN KARYAWAN"], label: "BPJS", type: "bpjs" },
  { keywords: ["GAJI","UPAH","HONOR","INSENTIF","BONUS KARYAWAN","TUNJANGAN","PESANGON","THR"], label: "Insentif / Gaji", type: "salary_support" },
  { keywords: ["SERVICE","REPAIR","PERBAIKAN","PEMELIHARAAN","MAINTENANCE","GAS LPG","TABUNG GAS","REGULATOR","SPARE PART","GANTI OLI","SERVIS AC","CUCI AC"], label: "Maintenance", type: "maintenance" },
  { keywords: ["IKLAN","PROMO","MARKETING","FLYER","BANNER","SPANDUK","BROSUR","SOCIAL MEDIA","SOSMED","ENDORSE"], label: "Marketing", type: "marketing" },
  { keywords: ["KOMISI","FEE PLATFORM","GRAB FEE","GOFOOD FEE","SHOPEE FEE","MDR","BIAYA TRANSFER","BIAYA BANK","ADMIN BANK"], label: "Platform Fee", type: "fee" },
];

const RULES = INFERENCE_RULES.map((r) => ({
  pattern: new RegExp(`\\b(${r.keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`),
  label: r.label,
  type: r.type,
}));

/**
 * Returns inferred {label, type} for an item or description string.
 * Falls back to { label: "Lain-lain", type: "other" } if no rule matches.
 *
 * This is the pure/static fallback. Server-side code that has DB access
 * should prefer `inferFromRules(text, rules[])` which reads from the
 * `categoryRules` table — keeps the ruleset editable without code change.
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
 * DB-backed inference. Caller supplies the `categoryRules` rows already
 * sorted by priority asc (lower = checked first). Matches a keyword if it
 * appears as a substring (UPPER) of the text. Returns first match.
 *
 * Use from client (parsers) via useQuery(api.features.masterData.queries.listCategoryRules)
 * or from a Convex mutation via ctx.db.query("categoryRules")...
 */
export function inferFromRules(
  text: string,
  rules: Array<{ keyword: string; label: string; type: string; priority: number; isActive: boolean }>,
): InferredCategory | null {
  const up = String(text ?? "").toUpperCase();
  if (!up.trim()) return null;
  const sorted = [...rules].filter((r) => r.isActive).sort((a, b) => a.priority - b.priority);

  // Pass 1: literal substring match (preserves spacing)
  for (const r of sorted) {
    if (up.includes(r.keyword.toUpperCase())) {
      return { label: r.label, type: r.type as CategoryType };
    }
  }

  // Pass 2: whitespace-stripped match — handles variant spellings like
  // "TFOWNER" vs "TF OWNER", "KIRIMLAPORAN" vs "KIRIM LAPORAN". Restricted
  // to keywords ≥4 chars (stripped) to avoid noise from tiny abbreviations.
  const upStripped = up.replace(/\s+/g, "");
  for (const r of sorted) {
    const kwStripped = r.keyword.toUpperCase().replace(/\s+/g, "");
    if (kwStripped.length >= 4 && upStripped.includes(kwStripped)) {
      return { label: r.label, type: r.type as CategoryType };
    }
  }

  return null;
}

/**
 * Test if a sheet name matches a known sheet pattern (case-insensitive
 * substring). Returns the matching registry row or null.
 */
export function matchSheetPattern(
  sheetName: string,
  registry: Array<{ sheetNamePattern: string; isParsed: boolean; isActive: boolean }>,
): { isParsed: boolean } | null {
  const up = sheetName.toUpperCase();
  for (const r of registry) {
    if (!r.isActive) continue;
    if (up.includes(r.sheetNamePattern.toUpperCase())) return { isParsed: r.isParsed };
  }
  return null;
}

/**
 * Check whether an inferred result is the fallback (i.e. nothing matched).
 */
export function isUncategorized(label: string): boolean {
  const up = normalizeAlias(label);
  return up === "LAIN-LAIN" || up === "UMUM" || up === "OTHER" || up === "";
}
