import { describe, it, expect } from "vitest";
import { normalize, parseCsvLine, normalizeDate } from "./csvShared";

// laporan-pic CSV utilities parse owner-supplied vendor-piutang exports.
// Quote handling + date normalization bugs here silently corrupt financial
// matching, so the edge cases are locked down explicitly.

describe("normalize (header key matching)", () => {
  it("lowercases and strips spaces, underscores, hyphens", () => {
    expect(normalize("Nominal Piutang")).toBe("nominalpiutang");
    expect(normalize("REF_File-PDF Name")).toBe("reffilepdfname");
    expect(normalize("  Tanggal Piutang  ")).toBe("tanggalpiutang");
  });
  it("is idempotent", () => {
    expect(normalize(normalize("Match Status"))).toBe(normalize("Match Status"));
  });
});

describe("parseCsvLine", () => {
  it("splits a plain comma row", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
  it("preserves commas inside quotes", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });
  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvLine('"a""b",c')).toEqual(['a"b', "c"]);
  });
  it("keeps empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
    expect(parseCsvLine(",")).toEqual(["", ""]);
  });
  it("keeps a trailing empty field", () => {
    expect(parseCsvLine("a,")).toEqual(["a", ""]);
  });
  it("returns a single empty field for an empty line", () => {
    expect(parseCsvLine("")).toEqual([""]);
  });
  it("strips the surrounding quotes from a fully-quoted field", () => {
    expect(parseCsvLine('"hello"')).toEqual(["hello"]);
  });
});

describe("normalizeDate", () => {
  it("passes through ISO and zero-pads", () => {
    expect(normalizeDate("2026-04-29")).toBe("2026-04-29");
    expect(normalizeDate("2026-4-9")).toBe("2026-04-09");
  });
  it("converts M/D/YYYY (the documented Excel-export contract)", () => {
    expect(normalizeDate("1/26/2026")).toBe("2026-01-26");
    expect(normalizeDate("12/31/2025")).toBe("2025-12-31");
  });
  it("returns null for blank or unparseable input", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate("   ")).toBeNull();
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("29 April 2026")).toBeNull();
  });
});
