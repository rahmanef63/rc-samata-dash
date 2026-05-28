import { describe, it, expect } from "vitest";
import { validateParsedData } from "./validateParsedData";

// The pre-import validation gate that surfaces data-quality warnings to the
// owner. Informational only (never blocks import), but a regression here means
// real problems (negative amounts, out-of-period dates, cash-flow imbalance)
// stop being flagged. Each numbered check is exercised independently.

type Data = Parameters<typeof validateParsedData>[0];

const emptyData = (over: Partial<Data> = {}): Data => ({
  penjualan: [],
  platformSales: [],
  vendor: [],
  hppProduk: [],
  costAnalysis: [],
  cashFlow: [],
  kasPeriode: [],
  lpkk: [],
  weeklyFc: [],
  periodStart: "2026-04-01",
  periodEnd: "2026-04-07",
  ...over,
});

const has = (ws: ReturnType<typeof validateParsedData>, cat: string) =>
  ws.some((w) => w.category === cat);

const sales = (rows: Array<{ productName: string; amount: number; unitPrice?: number; businessDate?: string }>) =>
  rows.map((r) => ({ unitPrice: 1, businessDate: "2026-04-03", ...r })) as unknown as Data["penjualan"];

describe("validateParsedData", () => {
  it("flags a missing period (check 1)", () => {
    expect(has(validateParsedData(emptyData({ periodStart: "", periodEnd: "" })), "Periode")).toBe(true);
    expect(has(validateParsedData(emptyData()), "Periode")).toBe(false);
  });

  it("flags empty tables (check 2)", () => {
    expect(has(validateParsedData(emptyData()), "Data Kosong")).toBe(true);
  });

  it("flags negative amounts (check 5)", () => {
    const ws = validateParsedData(emptyData({ penjualan: sales([{ productName: "RETUR X", amount: -5000, unitPrice: -100 }]) }));
    expect(has(ws, "Nilai Negatif")).toBe(true);
  });

  it("HPP coverage: warns a revenue product with no HPP, clears when HPP exists (check 3)", () => {
    const noHpp = validateParsedData(emptyData({ penjualan: sales([{ productName: "AYAM GEPREK", amount: 10000 }]) }));
    expect(has(noHpp, "HPP Coverage")).toBe(true);

    const withHpp = validateParsedData(emptyData({
      penjualan: sales([{ productName: "AYAM GEPREK", amount: 10000 }]),
      hppProduk: [{ productName: "AYAM GEPREK" }] as unknown as Data["hppProduk"],
    }));
    expect(has(withHpp, "HPP Coverage")).toBe(false);
  });

  it("HPP coverage: skips non-revenue PAKET/combo products", () => {
    const ws = validateParsedData(emptyData({ penjualan: sales([{ productName: "PAKET HEMAT", amount: 10000 }]) }));
    expect(has(ws, "HPP Coverage")).toBe(false);
  });

  it("date range: ±1 day tolerated, beyond is flagged (check 6)", () => {
    const inRange = validateParsedData(emptyData({ penjualan: sales([{ productName: "X", amount: 1, businessDate: "2026-04-08" }]) }));
    expect(has(inRange, "Tanggal")).toBe(false);

    const outOfRange = validateParsedData(emptyData({ penjualan: sales([{ productName: "X", amount: 1, businessDate: "2026-04-20" }]) }));
    expect(has(outOfRange, "Tanggal")).toBe(true);
  });

  it("cash flow: flags a >Rp100k imbalance, clears when balanced (check 7)", () => {
    const cf = (closingBalance: number) =>
      [{ businessDate: "2026-04-03", openingBalance: 0, salesInflow: 1_000_000, otherInflow: 0, expenseOutflow: 0, otherOutflow: 0, closingBalance }] as unknown as Data["cashFlow"];
    expect(has(validateParsedData(emptyData({ cashFlow: cf(500_000) })), "Cash Flow")).toBe(true);
    expect(has(validateParsedData(emptyData({ cashFlow: cf(1_000_000) })), "Cash Flow")).toBe(false);
  });

  it("flags likely duplicate product names (check 8)", () => {
    const ws = validateParsedData(emptyData({
      penjualan: sales([
        { productName: "AYAM BAKAR", amount: 10000 },
        { productName: "AYAMBAKAR", amount: 10000 },
      ]),
    }));
    expect(has(ws, "Duplikat Nama")).toBe(true);
  });

  it("flags unknown sheets, suppresses ones in the registry (check 10)", () => {
    expect(has(validateParsedData(emptyData({ unknownSheets: ["WEIRD SHEET"] })), "Sheet Baru")).toBe(true);

    const known = validateParsedData(emptyData({
      unknownSheets: ["WEIRD SHEET"],
      sheetRegistry: [{ sheetNamePattern: "WEIRD", isParsed: false, isActive: true }],
    }));
    expect(has(known, "Sheet Baru")).toBe(false);
  });
});
