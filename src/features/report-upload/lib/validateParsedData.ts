/**
 * Client-side validation for parsed Excel data.
 * Runs after parsing but before import to catch data quality issues.
 *
 * ALL validations are INFORMATIONAL ONLY — they never block import.
 * User can always upload and delete later if something is wrong.
 */

import type { ProductSaleItem } from "../parsers/parsePenjualan";
import type { VendorPurchaseItem } from "../parsers/parseVendor";
import type { ProductHPPItem } from "../parsers/parseHPPProduk";
import type { CostAnalysisItem } from "../parsers/parseCostAnalysis";
import type { DailyCashFlowItem } from "../parsers/parseLapCF";
import type { DailyCashSummaryItem } from "../parsers/parseLaporanKasPeriode";
import type { LPKKItem } from "../parsers/parseLPKK";
import type { InventoryValuationItem } from "../parsers/parseWeeklyFC";
import { isUncategorized, inferFromRules } from "../../../../convex/shared/categoryInference";

export type ValidationSeverity = "warning" | "info";

export type ValidationWarning = {
  severity: ValidationSeverity;
  category: string;
  message: string;
  tip: string;
  /** Truncated list shown in card UI + persisted to DB. */
  details?: string[];
  /** Complete list, in-memory only — used by the Copy button so owner can paste full set into AI. */
  fullDetails?: string[];
};

type ParsedDataForValidation = {
  penjualan: ProductSaleItem[];
  platformSales: ProductSaleItem[];
  vendor: VendorPurchaseItem[];
  hppProduk: ProductHPPItem[];
  costAnalysis: CostAnalysisItem[];
  cashFlow: DailyCashFlowItem[];
  kasPeriode: DailyCashSummaryItem[];
  lpkk: LPKKItem[];
  weeklyFc: InventoryValuationItem[];
  unknownSheets?: string[];
  periodStart: string;
  periodEnd: string;
  /** DB-backed sheet registry — filters known-skipped sheets out of Sheet Baru warning. */
  sheetRegistry?: Array<{ sheetNamePattern: string; isParsed: boolean; isActive: boolean }>;
  /** DB-backed category rules — predicts server-side upgrade so "Lain-lain" count is accurate even when parser used static fallback. */
  categoryRules?: Array<{ keyword: string; label: string; type: string; priority: number; isActive: boolean }>;
  /** Cross-file HPP pool — unique product names from productHPP across ALL
   *  prior reports. Validator merges ini ke HPP set sebelum coverage check
   *  so produk yang sudah punya HPP di file lama gak di-warn. */
  globalHppNames?: string[];
  /** Cross-file Cost Analysis pool — sama pattern dengan globalHppNames. */
  globalCostAnalysisNames?: string[];
};

/** Shift YYYY-MM-DD by N days. Returns same format. */
function shiftDate(yyyymmdd: string, deltaDays: number): string {
  const d = new Date(`${yyyymmdd}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize for comparison — permissive untuk match HPP vs Sales:
 *  - strip parenthetical variant info "(ES TEH / S-TEE)"
 *  - strip "TAKE AWAY" suffix (variant flag, bukan beda produk)
 *  - strip ingredient prefixes
 *  - collapse "." → " " (P.ATAS → P ATAS), then space-normalize
 *  - expand RC Samata-specific abbreviations
 */
function normalize(name: string): string {
  let n = name
    .toUpperCase()
    .trim()
    .replace(/^(DAGING\s+|BAHAN\s+|BUMBU\s+)/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+TAKE\s+AWAY\b/g, "")
    .replace(/[./,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Sales-side abbreviations (RC Samata POS naming):
  //   "DD MATAH" → "DADA MATAH"  (DD = singkatan Dada)
  //   "DD TERASI" → "DADA TERASI"
  //   "P AYAM UTUH ORIGINAL" → "PAKET AYAM UTUH ORIGINAL"
  //   "P HOT SPICY 1" → "PAKET HOT SPICY 1"
  //   "PB 3 PCS" → "PAHA BAWAH 3 PCS"
  //   "SYP 3PCS" → "SAYAP 3 PCS"
  n = n
    .replace(/^DD\s+/, "DADA ")
    .replace(/^P\s+AYAM\s+UTUH/, "PAKET AYAM UTUH")
    .replace(/^P\s+HOT\s+SPICY/, "PAKET HOT SPICY")
    .replace(/^P\s+HOT\s+CHEESY/, "PAKET HOT CHEESY")
    .replace(/^PB\s+/, "PAHA BAWAH ")
    .replace(/^SYP\s+/, "SAYAP ");
  return n;
}

/** Sales products yang BUKAN target HPP coverage warning:
 *  - "FREE *" — promo items, zero cost
 *  - "KOIN *" — non-food revenue (kiddy ride)
 *  - amount = 0 — gak ada sales aktual
 *  - "SAOS *" / "SAMBAL *" — condiments add-on, biasanya bundled
 *  - "TAMBAH *" — extra add-on, bundled
 *  - Beverage resale (TEH BOTOL/MILO/S-TEE/AIR MINERAL/ES TEH/dst) — no recipe
 *  - "PAKET *" / "BASSORO *" / "FAMILY BUCKET *" / "BUCKET *" — combo items.
 *    HPP combo = sum komponen (paha + nasi + minum + cover + saos) yang owner
 *    biasanya gak hitung di Excel template. Margin combo bisa di-derive dari
 *    komponen di laporan analitik kalau perlu — gak perlu warn di upload time.
 */
function isNonRevenueProduct(productName: string, amount: number): boolean {
  if (amount <= 0) return true;
  const up = productName.toUpperCase().trim();
  if (up.startsWith("FREE ")) return true;
  if (up.startsWith("KOIN ")) return true;
  if (/^SAOS\s/.test(up)) return true;
  if (/^SAMBAL\s/.test(up)) return true;
  if (/^TAMBAH\s/.test(up)) return true;
  if (
    /^(AIR\s+MINERAL|TEH\s+BOTOL|FRUIT\s+TEA|S[-\s]?TEE|ES\s+TEH|MILO|THAI\s+GREEN|MILKY\s+MANGO|TBO\b|TEH\s+SOSRO|MILKSHAKE)/.test(
      up,
    )
  )
    return true;
  if (/^(PAKET|BASSORO|FAMILY\s+BUCKET|BUCKET\s)/.test(up)) return true;
  return false;
}

/** Vendor items yang bukan ingredient — skip dari Cost Analysis coverage warning.
 *  Packaging/supplies/office/utility/promo gak butuh cross-check dengan
 *  Cost Analysis sheet (mereka consumables/services, bukan bahan baku).
 */
function isNonIngredientVendorItem(name: string): boolean {
  const up = name.toUpperCase().trim();
  if (/^(PLASTIK|BOX|COVER|CUP|KANTONG|PAPER|SEDOTAN|ALAS)\b/.test(up)) return true;
  if (/^(TISSUE|SENDOK|TUSUK|HAND\s+GLOVE|CABLE\s+TIE|ISOLASI|PEMBERSIH)\b/.test(up)) return true;
  if (/^(NOTA|FOTOCOPY|ATK|STRUK)\b/.test(up)) return true;
  if (/^(GAS\s+ELPIJI|TRANSPORT)\b/.test(up)) return true;
  if (/^(TOPI|BALON|KARTU\s+UNDANGAN)\b/.test(up)) return true;
  if (up === "ES" || up === "NASGOR DLL") return true;
  return false;
}

/** Token-overlap fallback — catches "PAKET GEPREK BAWANG 1" ↔ HPP "GEPREK BAWANG".
 *  Stopwords + number-only + short tokens dropped. Require ≥2 shared distinguishing tokens. */
function tokenOverlap(salesNorm: string, hppNames: Set<string>): boolean {
  const STOPWORDS = new Set(["PAKET", "TAKE", "AWAY", "DENGAN", "DAN", "ATAU"]);
  const salesTokens = salesNorm
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  if (salesTokens.length < 2) return false;
  for (const h of hppNames) {
    const hppTokens = new Set(
      h.split(/\s+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
    );
    if (hppTokens.size < 2) continue;
    const shared = salesTokens.filter((t) => hppTokens.has(t));
    if (shared.length >= 2) return true;
  }
  return false;
}

/** Permissive containment check + token-overlap fallback for PAKET variants. */
function nameMatches(salesNorm: string, hppNames: Set<string>): boolean {
  if (hppNames.has(salesNorm)) return true;
  for (const h of hppNames) {
    if (h.length < 4 || salesNorm.length < 4) continue;
    if (salesNorm.startsWith(h) || h.startsWith(salesNorm)) return true;
    if (salesNorm.includes(h) || h.includes(salesNorm)) return true;
  }
  return tokenOverlap(salesNorm, hppNames);
}

export function validateParsedData(data: ParsedDataForValidation, fileName?: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // 1. Period date validation
  if (!data.periodStart || !data.periodEnd) {
    warnings.push({
      severity: "warning",
      category: "Periode",
      message: "Periode tidak terdeteksi dari nama file",
      tip: fileName
        ? `"${fileName}" tidak mengandung pola tanggal yang dikenali. Nama file harus memuat format: DD-DD MMM YYYY (contoh: 1-7 JAN 2025).`
        : "Nama file harus memuat format tanggal: DD-DD MMM YYYY (contoh: 1-7 JAN 2025).",
      details: [
        "Pola yang dicari: angka-angka BULAN TAHUN (misal: 24-30 MAR 2026)",
        "Bulan valid: JAN FEB MAR APR MEI/MAY JUN JUL AGU/AUG SEP OKT/OCT NOV DES/DEC",
        "Tanpa periode, laporan tidak bisa dicek duplikat dan pengelompokan mungkin salah",
        "Rename file sesuai pola di atas, lalu upload ulang",
      ],
    });
  }

  // 2. Empty table detection
  const emptySections: string[] = [];
  if (data.penjualan.length === 0 && data.platformSales.length === 0) emptySections.push("Penjualan");
  if (data.vendor.length === 0) emptySections.push("Vendor");
  if (data.hppProduk.length === 0) emptySections.push("HPP Produk");
  if (data.cashFlow.length === 0) emptySections.push("Cash Flow");
  if (data.kasPeriode.length === 0) emptySections.push("Kas Periode");

  if (emptySections.length > 0) {
    warnings.push({
      severity: "info",
      category: "Data Kosong",
      message: `${emptySections.length} tabel tidak ada data`,
      tip: "Tidak semua sheet harus terisi. Tabel kosong akan di-skip saat import.",
      details: emptySections.map((s) => `${s}: 0 record`),
    });
  }

  // 3. Sales products without HPP — potential profitability blind spot.
  // Filter out non-revenue products (FREE/KOIN/Sambal/Saos add-ons) and
  // zero-amount rows — those don't need HPP coverage.
  const allSales = [...data.penjualan, ...data.platformSales];
  const revenueSales = allSales.filter((s) => !isNonRevenueProduct(s.productName, s.amount));
  const salesProductNames = [...new Set(revenueSales.map((s) => normalize(s.productName)))];
  // Merge file-local HPP + cross-file HPP pool (productHPP across all reports)
  // — a product yang sudah punya HPP di upload sebelumnya gak perlu di-warn.
  const hppProductNames = new Set([
    ...data.hppProduk.map((h) => normalize(h.productName)),
    ...(data.globalHppNames ?? []).map((n) => normalize(n)),
  ]);

  const salesWithoutHPP = salesProductNames.filter((n) => !nameMatches(n, hppProductNames));
  if (salesWithoutHPP.length > 0) {
    warnings.push({
      severity: "info",
      category: "HPP Coverage",
      message: `${salesWithoutHPP.length} produk penjualan tanpa data HPP`,
      tip: "Produk ini tetap di-import, tapi perhitungan margin/profit tidak bisa dihitung karena tidak ada data HPP. Ini normal jika sheet HPP tidak lengkap.",
      details: salesWithoutHPP.slice(0, 10),
      fullDetails: salesWithoutHPP,
    });
  }

  // 4. Vendor items without cost analysis — filter non-ingredient items
  //    (packaging/supplies/office/utility/promo) since they never need
  //    cost analysis cross-check.
  const vendorIngredients = data.vendor.filter((v) => !isNonIngredientVendorItem(v.commodityName));
  const vendorNames = [...new Set(vendorIngredients.map((v) => normalize(v.commodityName)))];
  // Merge file-local + cross-file Cost Analysis pool — vendor item yang sudah
  // pernah punya cost analysis di file lama gak perlu di-warn.
  const caNames = new Set([
    ...data.costAnalysis.map((c) => normalize(c.itemName)),
    ...(data.globalCostAnalysisNames ?? []).map((n) => normalize(n)),
  ]);

  const vendorWithoutCA = vendorNames.filter((n) => !nameMatches(n, caNames));
  if (vendorWithoutCA.length > 5) {
    warnings.push({
      severity: "info",
      category: "Cost Analysis",
      message: `${vendorWithoutCA.length} item vendor tanpa cost analysis`,
      tip: "Item vendor tetap di-import. Cost analysis hanya untuk cross-check harga vendor — tidak wajib ada.",
      details: vendorWithoutCA.slice(0, 8),
      fullDetails: vendorWithoutCA,
    });
  }

  // 5. Negative amounts detection
  const negativeItems: string[] = [];
  for (const s of allSales) {
    if (s.amount < 0) negativeItems.push(`Penjualan: ${s.productName} = ${s.amount}`);
    if (s.unitPrice < 0) negativeItems.push(`Harga: ${s.productName} = ${s.unitPrice}`);
  }
  for (const v of data.vendor) {
    if (v.closingValue < 0) negativeItems.push(`Vendor closing: ${v.commodityName} = ${v.closingValue}`);
  }

  if (negativeItems.length > 0) {
    warnings.push({
      severity: "warning",
      category: "Nilai Negatif",
      message: `${negativeItems.length} record dengan nilai negatif`,
      tip: "Nilai negatif bisa berarti retur atau koreksi. Data tetap di-import apa adanya — cek di laporan jika angka terlihat janggal.",
      details: negativeItems.slice(0, 8),
      fullDetails: negativeItems,
    });
  }

  // 6. Date range validation — check if data dates fall within period.
  //    Tolerance ±1 day: RC Samata weekly reports often include preceding
  //    Saturday's closeout (1 day before period start) or following Monday's
  //    setoran (1 day after period end). Only flag if data >1 day outside.
  if (data.periodStart && data.periodEnd) {
    const dayBefore = shiftDate(data.periodStart, -1);
    const dayAfter = shiftDate(data.periodEnd, 1);
    const outOfRange: string[] = [];
    for (const s of allSales) {
      if (s.businessDate < dayBefore || s.businessDate > dayAfter) {
        outOfRange.push(`Penjualan ${s.businessDate}: ${s.productName}`);
      }
    }
    for (const cf of data.cashFlow) {
      if (cf.businessDate < dayBefore || cf.businessDate > dayAfter) {
        outOfRange.push(`Cash flow ${cf.businessDate}`);
      }
    }

    const unique = [...new Set(outOfRange)];
    if (unique.length > 0) {
      warnings.push({
        severity: "warning",
        category: "Tanggal",
        message: `${unique.length} record jauh di luar periode ${data.periodStart} → ${data.periodEnd}`,
        tip: "Tanggal lebih dari 1 hari di luar periode. Kemungkinan typo tanggal di Excel. Data tetap di-import — cek ulang setelah import.",
        details: unique.slice(0, 8),
        fullDetails: unique,
      });
    }
  }

  // 7. Cash flow consistency — closing should roughly equal opening + sales - expense
  for (const cf of data.cashFlow) {
    const expected = cf.openingBalance + cf.salesInflow + cf.otherInflow - cf.expenseOutflow - cf.otherOutflow;
    const diff = Math.abs(cf.closingBalance - expected);
    if (diff > 100000 && cf.closingBalance > 0) {
      const sign = cf.closingBalance < expected ? "kurang" : "lebih";
      warnings.push({
        severity: "warning",
        category: "Cash Flow",
        message: `Cash flow ${cf.businessDate}: selisih Rp ${Math.round(diff).toLocaleString("id-ID")} (saldo aktual ${sign})`,
        tip:
          cf.closingBalance < expected
            ? "Saldo akhir lebih kecil dari ekspektasi — ada UANG KELUAR yang belum tercatat. Cek sheet 'TF OWNER' / 'OWNER TRANSFERS' / setoran kas besar / pergantian produk di periode ini. Setelah ketemu, tambah ke LPKK atau LAP. CF entry sebelum upload ulang."
            : "Saldo akhir lebih besar dari ekspektasi — ada UANG MASUK yang belum tercatat. Cek 'PENERIMAAN LAIN-LAIN' di LAP. CF atau TOP UP yang belum di-record.",
        details: [
          `Opening: ${cf.openingBalance.toLocaleString("id-ID")}`,
          `Sales inflow: +${cf.salesInflow.toLocaleString("id-ID")}`,
          `Other inflow: +${cf.otherInflow.toLocaleString("id-ID")}`,
          `Expense outflow: -${cf.expenseOutflow.toLocaleString("id-ID")}`,
          `Other outflow: -${cf.otherOutflow.toLocaleString("id-ID")}`,
          `Expected closing: ${expected.toLocaleString("id-ID")}`,
          `Actual closing: ${cf.closingBalance.toLocaleString("id-ID")}`,
          `Selisih ${sign}: ${Math.round(diff).toLocaleString("id-ID")}`,
        ],
      });
      break; // Only show first mismatch
    }
  }

  // 8. Duplicate product name detection (similar names that might be the same product)
  const productGroups = new Map<string, string[]>();
  for (const name of salesProductNames) {
    const key = name.replace(/\s/g, "").replace(/\./g, "");
    const existing = productGroups.get(key);
    if (existing) {
      existing.push(name);
    } else {
      productGroups.set(key, [name]);
    }
  }
  const dupes = [...productGroups.values()].filter((g) => g.length > 1);
  if (dupes.length > 0) {
    warnings.push({
      severity: "info",
      category: "Duplikat Nama",
      message: `${dupes.length} kemungkinan duplikat nama produk`,
      tip: "Nama produk yang mirip (beda spasi/titik) mungkin sebenarnya produk yang sama. Tidak mempengaruhi import.",
      details: dupes.slice(0, 5).map((g) => g.join(" ↔ ")),
      fullDetails: dupes.map((g) => g.join(" ↔ ")),
    });
  }

  // 9. Uncategorized expense rows — owner should validate before import
  //    so food ingredients don't silently land in "Lain-lain" bucket.
  //    Predict server-side upgrade: if categoryRules can recategorize the
  //    description, the row WON'T end up as "Lain-lain" in DB → skip from
  //    warning count.
  const willStayLainLain = (label: string, description: string): boolean => {
    if (!isUncategorized(label)) return false;
    if (data.categoryRules && data.categoryRules.length > 0) {
      const inferred = inferFromRules(description, data.categoryRules);
      if (inferred && !isUncategorized(inferred.label)) return false;
    }
    return true;
  };
  const lpkkLainLainAll = (data.lpkk ?? []).filter((l) => willStayLainLain(l.categoryLabel, l.description));
  const weeklyFcLainLain = (data.weeklyFc ?? []).filter((w) => willStayLainLain(w.category, w.itemName));

  // Split LPKK Lain-lain into empty-description (data quality issue,
  // owner harus fix di Excel) vs inference-failed (owner pilih manual di UI).
  const isEmptyDesc = (d: string) => !d || d === "—" || d.trim() === "";
  const lpkkEmpty = lpkkLainLainAll.filter((l) => isEmptyDesc(l.description));
  const lpkkInferFail = lpkkLainLainAll.filter((l) => !isEmptyDesc(l.description));

  if (lpkkEmpty.length > 0) {
    const all = lpkkEmpty.map((l) => `· ${l.expenseDate} — ${formatRp(l.amount)}`);
    warnings.push({
      severity: "warning",
      category: "Deskripsi Kosong",
      message: `${lpkkEmpty.length} baris Kas Kecil tanpa deskripsi (amount > 0)`,
      tip: "Sheet LPKK punya baris dengan jumlah > 0 tapi kolom Deskripsi kosong. Buka file Excel asli, isi deskripsi di kolom yang sesuai (kolom 14 / 'Deskripsi'), lalu upload ulang. Tanpa deskripsi, kategori inference gak bisa jalan dan baris masuk 'Lain-lain'.",
      details: all.slice(0, 5),
      fullDetails: all,
    });
  }

  if (lpkkInferFail.length > 0 || weeklyFcLainLain.length > 0) {
    const details: string[] = [];
    const fullDetails: string[] = [];
    if (lpkkInferFail.length > 0) {
      const head = `Kas Kecil: ${lpkkInferFail.length} baris tanpa kategori spesifik`;
      details.push(head);
      fullDetails.push(head);
      const all = lpkkInferFail.map((l) => `· ${l.expenseDate} — ${l.description} (${formatRp(l.amount)})`);
      details.push(...all.slice(0, 5));
      fullDetails.push(...all);
    }
    if (weeklyFcLainLain.length > 0) {
      const head = `Food Cost: ${weeklyFcLainLain.length} item tanpa kategori`;
      details.push(head);
      fullDetails.push(head);
      const all = weeklyFcLainLain.map((w) => `· ${w.itemName} (${w.qty} ${w.unit})`);
      details.push(...all.slice(0, 5));
      fullDetails.push(...all);
    }
    warnings.push({
      severity: "warning",
      category: "Kategori",
      message: `${lpkkInferFail.length + weeklyFcLainLain.length} baris masuk ke "Lain-lain"`,
      tip: "Inferensi otomatis gagal menebak kategori. Buka tab terkait di preview, klik kolom Kategori di tiap baris, lalu pilih kategori yang benar SEBELUM klik Import. Data masih bisa di-import tanpa diubah.",
      details,
      fullDetails,
    });
  }

  // 10. Unknown sheets — variant xlsx structure detected. Filter out
  //     sheets already registered via sheetTypeRegistry (DB-backed).
  if (data.unknownSheets && data.unknownSheets.length > 0) {
    const registry = data.sheetRegistry ?? [];
    const isKnown = (sheetName: string) => {
      const up = sheetName.toUpperCase();
      return registry.some((r) => r.isActive && up.includes(r.sheetNamePattern.toUpperCase()));
    };
    const truly = data.unknownSheets.filter((s) => !isKnown(s));
    if (truly.length > 0) {
      warnings.push({
        severity: "info",
        category: "Sheet Baru",
        message: `${truly.length} sheet belum punya parser`,
        tip: "Sheet ini belum ada di registry. Klik Settings → Master Data → Seed Semua untuk re-seed, atau tambah manual via Settings.",
        details: truly,
        fullDetails: truly,
      });
    }
  }

  return warnings;
}

function formatRp(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}
