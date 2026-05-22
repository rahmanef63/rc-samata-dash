// Universal file-kind detector. Reads xlsx workbook (CSV pre-converted to
// single-sheet xlsx in the caller) and decides which existing import flow
// applies. Returns first-match — order matters (most specific first).

import type XLSX from "xlsx";

export type FileKind =
  | "zia_multi"        // ZIA Group multi-sheet master file (auto-split)
  | "weekly_sv"        // Standard RC weekly SV report (multi-sheet)
  | "pergantian"       // Pergantian Produk standalone xlsx
  | "tunjangan"        // Tunjangan Karyawan standalone xlsx
  | "bank_statement"   // BCA / Mandiri / BRI statement
  | "payables_table"   // Bulk payables xlsx (vendorName/invoiceDate/amount cols)
  | "receipts_table"   // Bulk receipts xlsx (paidDate/amount/paidBy cols)
  | "vendors_table"    // Vendor master xlsx (name col)
  | "unknown";

export type DetectionResult = {
  kind: FileKind;
  confidence: "high" | "medium" | "low";
  reason: string;
  // For zia_multi — which sub-categories are present + extractable.
  ziaParts?: {
    pergantian: boolean;
    tunjangan: boolean;
    payables: boolean;
    vendors: boolean;
  };
};

function rowsOf(wb: XLSX.WorkBook, sheet: string): unknown[][] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  // SheetJS dependency available via dynamic import in caller — pass raw rows.
  // Here we use XLSX.utils via a lazy require shim.
  const X = (globalThis as { __XLSX__?: typeof XLSX }).__XLSX__;
  if (!X) return [];
  return X.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
}

function flatTextOfFirstRows(wb: XLSX.WorkBook, sheet: string, maxRows = 12): string {
  const rows = rowsOf(wb, sheet);
  return rows.slice(0, maxRows)
    .map((r) => r.map((c) => String(c ?? "")).join(" "))
    .join(" | ").toUpperCase();
}

export function detectFileKind(wb: XLSX.WorkBook): DetectionResult {
  const names = wb.SheetNames;

  // ── 1. ZIA Group multi-pocket master (most specific) ──────
  if (names.includes("_panduan") && names.includes("transaksi") && names.includes("vendor_register")) {
    return {
      kind: "zia_multi",
      confidence: "high",
      reason: "Detected ZIA Group multi-pocket schema (_panduan + transaksi + vendor_register sheets)",
      ziaParts: {
        pergantian: names.includes("pergantian_produk"),
        tunjangan: names.includes("tunjangan_karyawan"),
        payables: names.includes("transaksi"),
        vendors: names.includes("vendor_register"),
      },
    };
  }

  // ── 2. Weekly SV report (multi-sheet) ─────────────────────
  const sheetUpper = names.map((n) => n.toUpperCase());
  const weeklySignals = ["LAP. C-F", "LAP C-F", "PEMBELIAN KREDIT", "IKHTISAR FOOD COST", "LPKK", "PENJUALAN", "SALES CONTROL"];
  const hitCount = weeklySignals.filter((sig) => sheetUpper.some((sn) => sn.includes(sig))).length;
  if (hitCount >= 2) {
    return {
      kind: "weekly_sv",
      confidence: "high",
      reason: `Detected weekly SV report (${hitCount} signature sheets matched)`,
    };
  }

  // ── 3. Pergantian Produk (single-sheet) ──────────────────
  const first = names[0];
  if (first) {
    const text = flatTextOfFirstRows(wb, first);
    if (text.includes("PERGANTIAN PRODUK") || text.includes("NAMA BAHAN")) {
      return { kind: "pergantian", confidence: "high", reason: "First sheet header contains 'PERGANTIAN PRODUK' / 'NAMA BAHAN'" };
    }
    if (text.includes("TUNJANGAN KHUSUS") || text.includes("LUAR KOTA")) {
      return { kind: "tunjangan", confidence: "high", reason: "First sheet header contains 'TUNJANGAN KHUSUS' / 'LUAR KOTA'" };
    }
    if (text.includes("REKENING") && (text.includes("SALDO") || text.includes("MUTASI"))) {
      return { kind: "bank_statement", confidence: "medium", reason: "First sheet contains bank statement signals (REKENING + SALDO/MUTASI)" };
    }
  }

  // ── 4. Tabular formats — inspect header row ──────────────
  if (first) {
    const rows = rowsOf(wb, first);
    const header = (rows[0] ?? []).map((c) => String(c ?? "").trim().toLowerCase());
    const hasCol = (name: string) => header.some((h) => h.replace(/[\s_-]/g, "") === name.toLowerCase().replace(/[\s_-]/g, ""));

    if (hasCol("vendorName") && hasCol("invoiceDate") && hasCol("amount")) {
      return { kind: "payables_table", confidence: "high", reason: "Header row matches payables bulk schema" };
    }
    if (hasCol("paidDate") && hasCol("amount") && hasCol("paidBy")) {
      return { kind: "receipts_table", confidence: "high", reason: "Header row matches receipts bulk schema" };
    }
    if (hasCol("name") && (hasCol("type") || hasCol("phone")) && rows.length > 1) {
      return { kind: "vendors_table", confidence: "medium", reason: "Header row matches vendor master schema" };
    }
  }

  return { kind: "unknown", confidence: "low", reason: "File format not recognized. Pastikan workbook xlsx valid + sheet sesuai format upload." };
}

// Helper: install XLSX globally so detector can use sheet_to_json
// without taking xlsx as a direct dep (avoids circular import cost).
export function bindXlsx(X: typeof XLSX) {
  (globalThis as { __XLSX__?: typeof XLSX }).__XLSX__ = X;
}
