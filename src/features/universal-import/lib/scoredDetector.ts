// Scored detector — scores every known FileKind 0-100 and returns ranked
// list (highest first). Used by multi-file UnifiedUploader so user can see
// the top match + alternatives + manually override when detector is unsure.
//
// Complements `detector.ts` (first-match API) — keep both: existing
// UniversalImport still uses detector.ts; the new /upload uses this.

import type XLSX from "xlsx";
import type { FileKind } from "./detector";

export type ScoredDetection = {
  kind: FileKind;
  score: number;          // 0-100. >=70 = high, 40-69 = medium, 1-39 = low, 0 = no signal
  reasons: string[];      // human-readable hints why it matched
  /** zia_multi sub-parts. Only populated when kind === "zia_multi". */
  ziaParts?: { pergantian: boolean; tunjangan: boolean; payables: boolean; vendors: boolean };
};

// ── Helpers ─────────────────────────────────────────────────

function rowsOf(wb: XLSX.WorkBook, sheet: string): unknown[][] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  const X = (globalThis as { __XLSX__?: typeof XLSX }).__XLSX__;
  if (!X) return [];
  return X.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
}

function flatText(wb: XLSX.WorkBook, sheet: string, maxRows = 12): string {
  return rowsOf(wb, sheet).slice(0, maxRows)
    .map((r) => r.map((c) => String(c ?? "")).join(" "))
    .join(" | ").toUpperCase();
}

function normHeader(s: string): string {
  return s.toLowerCase().replace(/[\s_-]/g, "");
}

// ── Per-kind scorers ───────────────────────────────────────

function scoreZiaMulti(wb: XLSX.WorkBook): ScoredDetection {
  const names = wb.SheetNames;
  const required = ["_panduan", "transaksi", "vendor_register"];
  const hits = required.filter((s) => names.includes(s));
  if (hits.length === 0) return { kind: "zia_multi", score: 0, reasons: [] };
  if (hits.length < required.length) {
    return {
      kind: "zia_multi",
      score: Math.round((hits.length / required.length) * 50), // partial = max 50
      reasons: [`Hanya ${hits.length}/3 sheet ZIA core present: ${hits.join(", ")}`],
    };
  }
  const ziaParts = {
    pergantian: names.includes("pergantian_produk"),
    tunjangan: names.includes("tunjangan_karyawan"),
    payables: names.includes("transaksi"),
    vendors: names.includes("vendor_register"),
  };
  return {
    kind: "zia_multi",
    score: 100,
    reasons: ["Semua sheet ZIA core hadir (_panduan + transaksi + vendor_register)"],
    ziaParts,
  };
}

function scoreWeeklySv(wb: XLSX.WorkBook): ScoredDetection {
  const sheets = wb.SheetNames.map((n) => n.toUpperCase());
  const signals = [
    "LAP. C-F", "LAP C-F", "LAP. CF", "LAP CF",
    "PEMBELIAN KREDIT", "IKHTISAR FOOD COST", "LPKK",
    "PENJUALAN", "SALES CONTROL", "WEEKLY FC",
    "HITUNGAN HPP PRODUK", "COST ANALYSIS",
  ];
  const hits = signals.filter((sig) => sheets.some((sn) => sn.includes(sig)));
  if (hits.length === 0) return { kind: "weekly_sv", score: 0, reasons: [] };
  // Score: 6 hits → 100, less → linear scaled, cap at 100
  const score = Math.min(100, Math.round((hits.length / 6) * 100));
  return {
    kind: "weekly_sv",
    score,
    reasons: [`${hits.length} sheet signature weekly SV cocok: ${hits.slice(0, 5).join(", ")}${hits.length > 5 ? "…" : ""}`],
  };
}

function scorePergantian(wb: XLSX.WorkBook): ScoredDetection {
  const first = wb.SheetNames[0];
  if (!first) return { kind: "pergantian", score: 0, reasons: [] };
  const text = flatText(wb, first);
  if (text.includes("PERGANTIAN PRODUK")) {
    return { kind: "pergantian", score: 100, reasons: ["Header sheet pertama berisi 'PERGANTIAN PRODUK'"] };
  }
  if (text.includes("NAMA BAHAN") && text.includes("HARGA")) {
    return { kind: "pergantian", score: 75, reasons: ["Header berisi 'NAMA BAHAN' + 'HARGA' (kemungkinan pergantian)"] };
  }
  if (text.includes("NAMA BAHAN")) {
    return { kind: "pergantian", score: 50, reasons: ["Header berisi 'NAMA BAHAN' (mungkin pergantian)"] };
  }
  return { kind: "pergantian", score: 0, reasons: [] };
}

function scoreTunjangan(wb: XLSX.WorkBook): ScoredDetection {
  const first = wb.SheetNames[0];
  if (!first) return { kind: "tunjangan", score: 0, reasons: [] };
  const text = flatText(wb, first);
  if (text.includes("TUNJANGAN KHUSUS")) {
    return { kind: "tunjangan", score: 100, reasons: ["Header berisi 'TUNJANGAN KHUSUS'"] };
  }
  if (text.includes("LUAR KOTA") && text.includes("SUBSIDI")) {
    return { kind: "tunjangan", score: 90, reasons: ["Header berisi 'LUAR KOTA' + 'SUBSIDI'"] };
  }
  if (text.includes("LUAR KOTA")) {
    return { kind: "tunjangan", score: 60, reasons: ["Header berisi 'LUAR KOTA'"] };
  }
  return { kind: "tunjangan", score: 0, reasons: [] };
}

function scoreBankStatement(wb: XLSX.WorkBook): ScoredDetection {
  const first = wb.SheetNames[0];
  if (!first) return { kind: "bank_statement", score: 0, reasons: [] };
  const text = flatText(wb, first);
  const hasRek = text.includes("REKENING") || text.includes("NO. REK") || text.includes("ACCOUNT NO");
  const hasSaldo = text.includes("SALDO") || text.includes("BALANCE");
  const hasMutasi = text.includes("MUTASI") || text.includes("DEBET") || text.includes("KREDIT");
  let score = 0;
  const reasons: string[] = [];
  if (hasRek) { score += 35; reasons.push("Ada 'REKENING/NO. REK'"); }
  if (hasSaldo) { score += 30; reasons.push("Ada 'SALDO/BALANCE'"); }
  if (hasMutasi) { score += 35; reasons.push("Ada 'MUTASI/DEBET/KREDIT'"); }
  return { kind: "bank_statement", score, reasons };
}

function scoreTabular(wb: XLSX.WorkBook, requiredCols: string[][], partialCols: string[][] = []): { score: number; matchedRequired: string[]; matchedPartial: string[] } {
  const first = wb.SheetNames[0];
  if (!first) return { score: 0, matchedRequired: [], matchedPartial: [] };
  const rows = rowsOf(wb, first);
  if (rows.length < 2) return { score: 0, matchedRequired: [], matchedPartial: [] };
  const header = (rows[0] ?? []).map((c) => normHeader(String(c ?? "")));
  const matchAny = (aliases: string[]) => aliases.some((a) => header.includes(normHeader(a)));
  const matchedRequired = requiredCols.filter(matchAny).map((g) => g[0]);
  const matchedPartial = partialCols.filter(matchAny).map((g) => g[0]);
  if (matchedRequired.length < requiredCols.length) {
    // partial match — half credit
    const ratio = matchedRequired.length / requiredCols.length;
    return { score: Math.round(ratio * 50), matchedRequired, matchedPartial };
  }
  // all required hit; bonus from partial
  const bonus = Math.min(20, matchedPartial.length * 5);
  return { score: 80 + bonus, matchedRequired, matchedPartial };
}

function scorePayablesTable(wb: XLSX.WorkBook): ScoredDetection {
  const r = scoreTabular(
    wb,
    [["vendorName", "vendor_name", "vendor"], ["invoiceDate", "invoice_date", "tanggal"], ["amount", "total", "jumlah"]],
    [["dueDate", "due_date"], ["description", "desc"], ["paidAmount", "paid_amount"]],
  );
  if (r.score === 0) return { kind: "payables_table", score: 0, reasons: [] };
  return { kind: "payables_table", score: r.score, reasons: [`Header cocok ${r.matchedRequired.length}/3 kolom required (${r.matchedRequired.join(", ")})`] };
}

function scoreReceiptsTable(wb: XLSX.WorkBook): ScoredDetection {
  const r = scoreTabular(
    wb,
    [["paidDate", "paid_date"], ["amount", "total"], ["paidBy", "paid_by"]],
    [["reference", "ref"], ["description", "desc"]],
  );
  if (r.score === 0) return { kind: "receipts_table", score: 0, reasons: [] };
  return { kind: "receipts_table", score: r.score, reasons: [`Header cocok ${r.matchedRequired.length}/3 kolom receipts (${r.matchedRequired.join(", ")})`] };
}

function scoreVendorsTable(wb: XLSX.WorkBook): ScoredDetection {
  const r = scoreTabular(
    wb,
    [["name", "vendor_name", "vendorName"]],
    [["type", "category"], ["phone", "contact"], ["notes", "note"]],
  );
  if (r.score === 0) return { kind: "vendors_table", score: 0, reasons: [] };
  // Vendor needs at least 1 partial signal too (name alone too generic).
  if (r.matchedPartial.length === 0) {
    return { kind: "vendors_table", score: Math.min(r.score, 35), reasons: [`Header punya 'name' tapi tidak ada type/phone/notes — confidence rendah`] };
  }
  return { kind: "vendors_table", score: r.score, reasons: [`Header vendor cocok: name + ${r.matchedPartial.join("/")}`] };
}

// ── Main API ───────────────────────────────────────────────

export function scoreAllKinds(wb: XLSX.WorkBook): ScoredDetection[] {
  const results = [
    scoreZiaMulti(wb),
    scoreWeeklySv(wb),
    scorePergantian(wb),
    scoreTunjangan(wb),
    scoreBankStatement(wb),
    scorePayablesTable(wb),
    scoreReceiptsTable(wb),
    scoreVendorsTable(wb),
  ];
  // Sort highest score first
  return results.sort((a, b) => b.score - a.score);
}

export function topMatchOrUnknown(results: ScoredDetection[]): { kind: FileKind; score: number; reasons: string[] } {
  const top = results[0];
  // Threshold: must be > 30 to claim a match, otherwise "unknown"
  if (!top || top.score < 30) {
    return { kind: "unknown", score: 0, reasons: ["Tidak ada signature kuat cocok — pilih manual"] };
  }
  return { kind: top.kind, score: top.score, reasons: top.reasons };
}
