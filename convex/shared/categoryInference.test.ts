import { describe, it, expect } from "vitest";
import {
  inferIngredientCategory,
  inferFromRules,
  matchSheetPattern,
  isUncategorized,
} from "./categoryInference";

// Category inference routes uncategorized upload rows into expense buckets.
// A wrong inference silently lands an ingredient in "Lain-lain" or the wrong
// category → distorted cost reports. Rule order + fallback are locked here.

describe("inferIngredientCategory (static rules)", () => {
  it("buckets by first-matching keyword", () => {
    expect(inferIngredientCategory("Paha Ayam")).toEqual({ label: "Bahan Ayam", type: "cogs" });
    expect(inferIngredientCategory("Minyak Goreng Bimoli")).toEqual({ label: "Minyak Goreng", type: "cogs" });
    expect(inferIngredientCategory("Es Batu Kristal")).toEqual({ label: "Bahan Es", type: "cogs" });
    expect(inferIngredientCategory("Teh Sosro")).toEqual({ label: "Bahan Minuman", type: "cogs" });
    expect(inferIngredientCategory("Plastik Kemasan")).toEqual({ label: "Bahan Pembungkus", type: "cogs" });
    expect(inferIngredientCategory("Beras Premium")).toEqual({ label: "Groceries/Bumbu", type: "cogs" });
    expect(inferIngredientCategory("Sabun Sunlight")).toEqual({ label: "Bahan Pembersih", type: "utility" });
    expect(inferIngredientCategory("Bensin Pertalite")).toEqual({ label: "Transport", type: "utility" });
    expect(inferIngredientCategory("BPJS Kesehatan")).toEqual({ label: "BPJS", type: "bpjs" });
    expect(inferIngredientCategory("Gaji Karyawan")).toEqual({ label: "Insentif / Gaji", type: "salary_support" });
    expect(inferIngredientCategory("Service AC")).toEqual({ label: "Maintenance", type: "maintenance" });
    expect(inferIngredientCategory("Banner Promo")).toEqual({ label: "Marketing", type: "marketing" });
    expect(inferIngredientCategory("Komisi GoFood")).toEqual({ label: "Platform Fee", type: "fee" });
  });

  it("order matters — ayam rule precedes others", () => {
    // contains both AYAM and MINYAK; AYAM rule is first → wins
    expect(inferIngredientCategory("Ayam goreng pakai minyak").label).toBe("Bahan Ayam");
  });

  it("falls back to Lain-lain for no match / empty", () => {
    expect(inferIngredientCategory("Barang Misterius")).toEqual({ label: "Lain-lain", type: "other" });
    expect(inferIngredientCategory("")).toEqual({ label: "Lain-lain", type: "other" });
  });
});

describe("inferFromRules (DB-backed)", () => {
  const rules = [
    { keyword: "AYAM GORENG", label: "Spesifik", type: "cogs", priority: 1, isActive: true },
    { keyword: "AYAM", label: "Umum Ayam", type: "cogs", priority: 2, isActive: true },
    { keyword: "TF OWNER", label: "Transfer Owner", type: "other", priority: 3, isActive: true },
    { keyword: "PROMO LAMA", label: "Nonaktif", type: "marketing", priority: 0, isActive: false },
  ];

  it("returns lowest-priority match first", () => {
    expect(inferFromRules("Beli Ayam Goreng", rules)?.label).toBe("Spesifik");
    expect(inferFromRules("Beli Ayam Bakar", rules)?.label).toBe("Umum Ayam");
  });

  it("whitespace-stripped pass catches variant spelling (TFOWNER)", () => {
    expect(inferFromRules("Setoran TFOWNER malam", rules)?.label).toBe("Transfer Owner");
  });

  it("skips inactive rules", () => {
    expect(inferFromRules("PROMO LAMA banner", rules)).toBeNull();
  });

  it("returns null for no match / empty", () => {
    expect(inferFromRules("Sesuatu yang lain", rules)).toBeNull();
    expect(inferFromRules("", rules)).toBeNull();
  });
});

describe("matchSheetPattern", () => {
  const registry = [
    { sheetNamePattern: "LAP. CF", isParsed: true, isActive: true },
    { sheetNamePattern: "ARSIP", isParsed: false, isActive: false },
  ];
  it("matches active pattern case-insensitively", () => {
    expect(matchSheetPattern("lap. cf minggu 1", registry)).toEqual({ isParsed: true });
  });
  it("ignores inactive patterns and non-matches", () => {
    expect(matchSheetPattern("ARSIP LAMA", registry)).toBeNull();
    expect(matchSheetPattern("Sheet Asing", registry)).toBeNull();
  });
});

describe("isUncategorized", () => {
  it("treats fallback labels as uncategorized", () => {
    expect(isUncategorized("Lain-lain")).toBe(true);
    expect(isUncategorized("Umum")).toBe(true);
    expect(isUncategorized("")).toBe(true);
  });
  it("treats real categories as categorized", () => {
    expect(isUncategorized("Bahan Ayam")).toBe(false);
    expect(isUncategorized("Marketing")).toBe(false);
  });
});
