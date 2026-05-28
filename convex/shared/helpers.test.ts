import { describe, it, expect } from "vitest";
import {
  normalizeItemName,
  matchItemNames,
  generateItemCode,
  findBestMatch,
  categorizeProduct,
  categorizeIngredient,
} from "./helpers";

// Pure data-matching/categorization helpers used during import to link
// item names across tables (inventory / HPP / master data) and auto-bucket
// products & ingredients. A regression silently mis-links cost/stock rows.

describe("normalizeItemName", () => {
  it("uppercases, trims, collapses whitespace", () => {
    expect(normalizeItemName("  Paha   Atas ")).toBe("PAHA ATAS");
  });
  it("strips DAGING/BAHAN/BUMBU prefixes", () => {
    expect(normalizeItemName("Daging Ayam")).toBe("AYAM");
    expect(normalizeItemName("Bahan Tepung")).toBe("TEPUNG");
    expect(normalizeItemName("BUMBU Lada")).toBe("LADA");
  });
  it("treats null/undefined as empty string", () => {
    expect(normalizeItemName(null)).toBe("");
    expect(normalizeItemName(undefined)).toBe("");
  });
});

describe("matchItemNames", () => {
  it("matches on normalized equality (case/space-insensitive)", () => {
    expect(matchItemNames("Paha Atas", "PAHA ATAS")).toBe(true);
    expect(matchItemNames("paha atas", "pahaatas")).toBe(true);
  });
  it("matches bidirectional substring", () => {
    expect(matchItemNames("Ayam Goreng Crispy", "Ayam Goreng")).toBe(true);
  });
  it("matches across stripped prefix", () => {
    expect(matchItemNames("Daging Ayam", "Ayam")).toBe(true);
  });
  it("rejects unrelated names", () => {
    expect(matchItemNames("Teh Manis", "Kopi Hitam")).toBe(false);
  });
});

describe("generateItemCode", () => {
  it("zero-pads to 3 digits", () => {
    expect(generateItemCode("PRD", 1)).toBe("PRD-001");
    expect(generateItemCode("ING", 42)).toBe("ING-042");
  });
  it("does not truncate sequences over 999", () => {
    expect(generateItemCode("PRD", 1000)).toBe("PRD-1000");
  });
});

describe("findBestMatch", () => {
  const registry = [
    { normalizedName: "AYAM", aliases: ["CHICKEN"] },
    { normalizedName: "NASI PUTIH", aliases: ["WHITE RICE", "NASIPUTIH"] },
    { normalizedName: "ES TEH", aliases: [] },
  ];
  it("finds exact normalized match", () => {
    expect(findBestMatch("Daging Ayam", registry)).toBe(0); // prefix-stripped → AYAM
  });
  it("finds alias match", () => {
    expect(findBestMatch("White Rice", registry)).toBe(1);
  });
  it("finds substring match", () => {
    expect(findBestMatch("Es Teh Manis Dingin", registry)).toBe(2);
  });
  it("returns -1 when nothing matches", () => {
    expect(findBestMatch("Burger Keju", registry)).toBe(-1);
  });
});

describe("categorizeProduct", () => {
  it("prioritizes paket over other matches", () => {
    expect(categorizeProduct("Paket Ayam Komplit")).toBe("paket");
  });
  it("buckets chicken / sambal / drink / snack / other", () => {
    expect(categorizeProduct("Ayam Goreng")).toBe("ayam");
    expect(categorizeProduct("Sambal Bawang")).toBe("sambal");
    expect(categorizeProduct("Es Teh Manis")).toBe("minuman");
    expect(categorizeProduct("Kentang Goreng")).toBe("snack");
    expect(categorizeProduct("Tisu Makan")).toBe("lainnya");
  });
});

describe("categorizeIngredient", () => {
  it("buckets by keyword with protein taking priority", () => {
    expect(categorizeIngredient("Daging Ayam")).toBe("protein");
    expect(categorizeIngredient("Telur Ayam")).toBe("protein");
    expect(categorizeIngredient("Minyak Goreng")).toBe("minyak");
    expect(categorizeIngredient("Bawang Merah")).toBe("bumbu");
    expect(categorizeIngredient("Timun Segar")).toBe("sayur");
    expect(categorizeIngredient("Cup Plastik 22oz")).toBe("kemasan");
    expect(categorizeIngredient("Gula Pasir")).toBe("minuman_bahan");
    expect(categorizeIngredient("Barang Misterius")).toBe("lainnya");
  });
});
