import { describe, it, expect } from "vitest";
import { toNumber, toDateString, findSheetName } from "./xlsxHelpers";
import type * as XLSX from "xlsx";

// toNumber parses every monetary amount lifted from owner-typed Excel cells —
// Indonesian (60.000,50) and US (60,000.50) conventions both appear. A
// mis-parse silently corrupts financial figures, so the branch matrix is locked.

describe("toNumber", () => {
  it("passes through real numbers, coerces junk to 0", () => {
    expect(toNumber(60000)).toBe(60000);
    expect(toNumber(60000.5)).toBe(60000.5);
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("")).toBe(0);
    expect(toNumber(true)).toBe(0);
  });

  it("plain integer strings", () => {
    expect(toNumber("60000")).toBe(60000);
    expect(toNumber("-5000")).toBe(-5000);
  });

  it("Indonesian dot-thousands", () => {
    expect(toNumber("60.000")).toBe(60000);
    expect(toNumber("1.234.567")).toBe(1234567);
  });

  it("dot as decimal when not 3-digit groups", () => {
    expect(toNumber("60.5")).toBe(60.5);
  });

  it("US comma-thousands vs Indonesian comma-decimal", () => {
    expect(toNumber("60,000")).toBe(60000); // 3-digit group → thousands
    expect(toNumber("60,5")).toBe(60.5); // <3-digit → decimal
  });

  it("mixed separators resolve by last-separator position", () => {
    expect(toNumber("60.000,50")).toBe(60000.5); // ID: dot=thousands, comma=decimal
    expect(toNumber("60,000.50")).toBe(60000.5); // US: comma=thousands, dot=decimal
    expect(toNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("strips Rp prefix and whitespace", () => {
    expect(toNumber("Rp 60.000")).toBe(60000);
    expect(toNumber("Rp1.234.567,89")).toBe(1234567.89);
  });
});

describe("toDateString", () => {
  it("formats a Date object as YYYY-MM-DD", () => {
    expect(toDateString(new Date(2026, 3, 29))).toBe("2026-04-29");
  });
  it("parses Indonesian DD/MM/YYYY", () => {
    expect(toDateString("29/04/2026")).toBe("2026-04-29");
    expect(toDateString("5/1/2026")).toBe("2026-01-05");
  });
  it("rejects out-of-range slash dates", () => {
    expect(toDateString("32/13/2026")).toBeNull();
  });
  it("returns null for empty / falsy", () => {
    expect(toDateString(null)).toBeNull();
    expect(toDateString("")).toBeNull();
    expect(toDateString(0)).toBeNull();
  });
  it("converts an Excel serial number to a YYYY-MM-DD string", () => {
    expect(toDateString(45000)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("findSheetName", () => {
  const wb = { SheetNames: ["LAP. CF", "FC ITEM KELAS", "Sales Control"] } as unknown as XLSX.WorkBook;
  it("matches case-insensitive substring", () => {
    expect(findSheetName(wb, "cf")).toBe("LAP. CF");
    expect(findSheetName(wb, "sales")).toBe("Sales Control");
  });
  it("returns null when no sheet matches", () => {
    expect(findSheetName(wb, "inventory")).toBeNull();
  });
});
