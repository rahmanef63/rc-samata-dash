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
};

/** Normalize for comparison — permissive untuk match HPP vs Sales:
 *  - strip parenthetical variant info "(ES TEH / S-TEE)"
 *  - strip "TAKE AWAY" suffix (variant flag, bukan beda produk)
 *  - strip ingredient prefixes
 *  - collapse "." → " " (P.ATAS → P ATAS), then space-normalize
 */
function normalize(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/^(DAGING\s+|BAHAN\s+|BUMBU\s+)/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+TAKE\s+AWAY\b/g, "")
    .replace(/[./,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Permissive containment check — HPP "PAKET SEGAR 1" matches sales
 *  "PAKET SEGAR 1 TAKE AWAY (ES TEH / S-TEE)" and vice versa. */
function nameMatches(salesNorm: string, hppNames: Set<string>): boolean {
  if (hppNames.has(salesNorm)) return true;
  for (const h of hppNames) {
    if (h.length < 4 || salesNorm.length < 4) continue;
    if (salesNorm.startsWith(h) || h.startsWith(salesNorm)) return true;
    if (salesNorm.includes(h) || h.includes(salesNorm)) return true;
  }
  return false;
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

  // 3. Sales products without HPP — potential profitability blind spot
  const allSales = [...data.penjualan, ...data.platformSales];
  const salesProductNames = [...new Set(allSales.map((s) => normalize(s.productName)))];
  const hppProductNames = new Set(data.hppProduk.map((h) => normalize(h.productName)));

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

  // 4. Vendor items without cost analysis
  const vendorNames = [...new Set(data.vendor.map((v) => normalize(v.commodityName)))];
  const caNames = new Set(data.costAnalysis.map((c) => normalize(c.itemName)));

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

  // 6. Date range validation — check if data dates fall within period
  if (data.periodStart && data.periodEnd) {
    const outOfRange: string[] = [];
    for (const s of allSales) {
      if (s.businessDate < data.periodStart || s.businessDate > data.periodEnd) {
        outOfRange.push(`Penjualan ${s.businessDate}: ${s.productName}`);
      }
    }
    for (const cf of data.cashFlow) {
      if (cf.businessDate < data.periodStart || cf.businessDate > data.periodEnd) {
        outOfRange.push(`Cash flow ${cf.businessDate}`);
      }
    }

    const unique = [...new Set(outOfRange)];
    if (unique.length > 0) {
      warnings.push({
        severity: "warning",
        category: "Tanggal",
        message: `${unique.length} record di luar periode ${data.periodStart} → ${data.periodEnd}`,
        tip: "Kemungkinan tanggal di Excel berbeda dari periode nama file. Data tetap di-import semua — cek ulang nanti jika ada tanggal yang salah.",
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
      warnings.push({
        severity: "info",
        category: "Cash Flow",
        message: `Cash flow ${cf.businessDate}: selisih Rp ${Math.round(diff).toLocaleString("id-ID")}`,
        tip: "Ada selisih antara saldo penutup yang tercatat vs yang dihitung (opening + in - out). Bisa karena ada transaksi yang belum tercatat. Data tetap di-import.",
        details: [
          `Opening: ${cf.openingBalance.toLocaleString("id-ID")}`,
          `Sales: +${cf.salesInflow.toLocaleString("id-ID")}`,
          `Expense: -${cf.expenseOutflow.toLocaleString("id-ID")}`,
          `Expected closing: ${expected.toLocaleString("id-ID")}`,
          `Actual closing: ${cf.closingBalance.toLocaleString("id-ID")}`,
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
  const lpkkLainLain = (data.lpkk ?? []).filter((l) => willStayLainLain(l.categoryLabel, l.description));
  const weeklyFcLainLain = (data.weeklyFc ?? []).filter((w) => willStayLainLain(w.category, w.itemName));
  if (lpkkLainLain.length > 0 || weeklyFcLainLain.length > 0) {
    const details: string[] = [];
    const fullDetails: string[] = [];
    if (lpkkLainLain.length > 0) {
      const head = `Kas Kecil: ${lpkkLainLain.length} baris tanpa kategori spesifik`;
      details.push(head);
      fullDetails.push(head);
      const all = lpkkLainLain.map((l) => `· ${l.expenseDate} — ${l.description} (${formatRp(l.amount)})`);
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
      message: `${lpkkLainLain.length + weeklyFcLainLain.length} baris masuk ke "Lain-lain"`,
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
