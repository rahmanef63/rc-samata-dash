import { describe, it, expect } from "vitest";
import { normalizeAlias, looseEqual } from "./normalize";

// Canonical vendor/alias key + loose matching used across vendor / payables /
// counterparty equality. Locks the empty-guard (an empty name must NOT match
// everything — contrast the matchItemNames("") quirk flagged elsewhere).

describe("normalizeAlias", () => {
  it("uppercases and trims", () => {
    expect(normalizeAlias("  Ciomas Adisatwa  ")).toBe("CIOMAS ADISATWA");
  });
  it("coerces null/undefined to empty string", () => {
    expect(normalizeAlias(null)).toBe("");
    expect(normalizeAlias(undefined)).toBe("");
  });
});

describe("looseEqual", () => {
  it("matches case-insensitively when equal", () => {
    expect(looseEqual("Ciomas", "ciomas")).toBe(true);
  });
  it("matches bidirectional substring", () => {
    expect(looseEqual("PT Ciomas Adisatwa", "Ciomas")).toBe(true);
    expect(looseEqual("Japfa", "PT Japfa Comfeed")).toBe(true);
  });
  it("rejects unrelated names", () => {
    expect(looseEqual("Ciomas", "Japfa")).toBe(false);
  });
  it("never matches when either side is empty (no matches-all bug)", () => {
    expect(looseEqual("", "Ciomas")).toBe(false);
    expect(looseEqual("Ciomas", "")).toBe(false);
    expect(looseEqual("", "")).toBe(false);
  });
});
