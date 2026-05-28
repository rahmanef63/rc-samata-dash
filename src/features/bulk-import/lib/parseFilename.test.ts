import { describe, it, expect } from "vitest";
import {
  parseFilename,
  RECEIPT_CATEGORIES,
  PAYABLE_INVOICE_CATEGORIES,
  REFERENCE_CATEGORIES,
} from "./parseFilename";

// Characterization tests for the import-routing brain. parseFilename decides
// which bucket (receipt / payable / reference) an uploaded financial document
// lands in, plus extracts vendor/employee/date. A silent regression here
// mis-files an owner's payment proofs or invoices — high consequence.
//
// Expectations are derived from the documented format examples in
// parseFilename.ts. Only the unambiguous parts of the contract are asserted
// (category, ids, vendor/employee, full date for single-date type-prefixed
// names, period ranges) — the quirky `date` field for range descriptions is
// intentionally left unasserted to avoid codifying possibly-buggy behavior.

describe("parseFilename — type-prefixed pattern", () => {
  it("STRUK-ATM → struk_atm, owner = last segment of sub", () => {
    const r = parseFilename("STRUK-ATM_TF-Owner-Dzikrullah_29042026_20-01.jpg");
    expect(r.category).toBe("struk_atm");
    expect(r.ext).toBe("jpg");
    expect(r.date).toBe("2026-04-29");
    expect(r.time).toBe("20:01");
    expect(r.ownerName).toBe("Dzikrullah");
  });

  it("TF-SUPPLIER → tf_supplier with vendor", () => {
    const r = parseFilename("TF-SUPPLIER_CiomasAdisatwa_01012026_05-03.jpg");
    expect(r.category).toBe("tf_supplier");
    expect(r.vendor).toBe("CiomasAdisatwa");
    expect(r.date).toBe("2026-01-01");
    expect(r.time).toBe("05:03");
  });

  it("TF-ROYALTI → tf_royalti with vendor", () => {
    const r = parseFilename("TF-ROYALTI_RocketChickenSamata_22012026_07-18.jpg");
    expect(r.category).toBe("tf_royalti");
    expect(r.vendor).toBe("RocketChickenSamata");
    expect(r.date).toBe("2026-01-22");
  });

  it("TF-GAJI → tf_gaji with employee (not vendor)", () => {
    const r = parseFilename("TF-GAJI_DioBagusSetiawan_05012026_16-44.jpg");
    expect(r.category).toBe("tf_gaji");
    expect(r.employee).toBe("DioBagusSetiawan");
    expect(r.vendor).toBeUndefined();
    expect(r.date).toBe("2026-01-05");
    expect(r.time).toBe("16:44");
  });

  it("TF-PIUTANG → tf_piutang, sub kept as description", () => {
    const r = parseFilename("TF-PIUTANG_Piutang-Supplier_13042026_21-15.jpg");
    expect(r.category).toBe("tf_piutang");
    expect(r.description).toBe("Piutang-Supplier");
    expect(r.date).toBe("2026-04-13");
  });

  it("BANNER-PROMO / FOTO-MASALAH / LAPORAN-ONLINE map to reference categories", () => {
    expect(parseFilename("BANNER-PROMO_Promo-Ramadhan_25012026_15-12.jpg").category).toBe("banner_promo");
    expect(parseFilename("FOTO-MASALAH_Kerusakan-Outlet_13022026_15-45.jpg").category).toBe("foto_masalah");
    const online = parseFilename("LAPORAN-ONLINE_GoFood-Shopee-Harian_01012026_08-45.jpg");
    expect(online.category).toBe("laporan_online");
    expect(online.date).toBe("2026-01-01");
    expect(online.time).toBe("08:45");
  });

  it("is case-insensitive on the type prefix", () => {
    const r = parseFilename("tf-supplier_JapfaFood_01022026_09-30.JPG");
    expect(r.category).toBe("tf_supplier");
    expect(r.vendor).toBe("JapfaFood");
    expect(r.ext).toBe("jpg");
  });

  it("handles the optional trailing _NN counter", () => {
    const r = parseFilename("TF-SUPPLIER_CiomasAdisatwa_01012026_05-03_2.jpg");
    expect(r.category).toBe("tf_supplier");
    expect(r.vendor).toBe("CiomasAdisatwa");
    expect(r.date).toBe("2026-01-01");
  });
});

describe("parseFilename — chat-prefixed pattern", () => {
  it("Update piutang → update_piutang with chatId + period range", () => {
    const r = parseFilename("00000945-Update piutang 8-14 April 2026 18.05.pdf");
    expect(r.category).toBe("update_piutang");
    expect(r.chatId).toBe("00000945");
    expect(r.ext).toBe("pdf");
    expect(r.period).toEqual({ start: "2026-04-08", end: "2026-04-14" });
  });

  it("Laporan Keuangan → laporan_keuangan with split-month period", () => {
    const r = parseFilename("00000965-Laporan Keuangan 08 Apr 2026 - 14 Apr 2026.xls");
    expect(r.category).toBe("laporan_keuangan");
    expect(r.chatId).toBe("00000965");
    expect(r.ext).toBe("xls");
    expect(r.period).toEqual({ start: "2026-04-08", end: "2026-04-14" });
  });

  it("Nota → nota, strips trailing (n) suffix from period parse", () => {
    const r = parseFilename("00000966-Nota tgl 8-14 Maret 2026(2).pdf");
    expect(r.category).toBe("nota");
    expect(r.chatId).toBe("00000966");
    expect(r.period).toEqual({ start: "2026-03-08", end: "2026-03-14" });
  });
});

describe("parseFilename — fallback", () => {
  it("unknown name → other, description without extension", () => {
    const r = parseFilename("random vacation photo.jpg");
    expect(r.category).toBe("other");
    expect(r.ext).toBe("jpg");
    expect(r.description).toBe("random vacation photo");
    expect(r.chatId).toBeUndefined();
  });

  it("trims surrounding whitespace", () => {
    const r = parseFilename("  TF-GAJI_AdiNugroho_05012026_16-44.jpg  ");
    expect(r.category).toBe("tf_gaji");
    expect(r.employee).toBe("AdiNugroho");
  });
});

describe("category routing sets are mutually exclusive by purpose", () => {
  it("receipt categories never overlap payable categories", () => {
    for (const c of RECEIPT_CATEGORIES) {
      expect(PAYABLE_INVOICE_CATEGORIES.has(c)).toBe(false);
      expect(REFERENCE_CATEGORIES.has(c)).toBe(false);
    }
  });

  it("payable categories never overlap reference categories", () => {
    for (const c of PAYABLE_INVOICE_CATEGORIES) {
      expect(REFERENCE_CATEGORIES.has(c)).toBe(false);
    }
  });

  it("parsed receipts land in RECEIPT_CATEGORIES", () => {
    const receipt = parseFilename("TF-SUPPLIER_CiomasAdisatwa_01012026_05-03.jpg");
    expect(RECEIPT_CATEGORIES.has(receipt.category)).toBe(true);
  });

  it("parsed invoices land in PAYABLE_INVOICE_CATEGORIES", () => {
    const invoice = parseFilename("00000945-Update piutang 8-14 April 2026 18.05.pdf");
    expect(PAYABLE_INVOICE_CATEGORIES.has(invoice.category)).toBe(true);
  });
});
