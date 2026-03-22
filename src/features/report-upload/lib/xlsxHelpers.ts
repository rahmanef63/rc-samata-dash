import * as XLSX from "xlsx";

export type RawSheet = (string | number | Date | null | boolean)[][];

/**
 * Parse file Excel menjadi map sheet_name → 2D array of values.
 */
export async function parseExcelFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "buffer", cellDates: true });
}

/**
 * Ambil sheet sebagai 2D array. Row & col index mulai dari 0.
 */
export function getSheetRows(wb: XLSX.WorkBook, sheetName: string): RawSheet {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<(string | number | Date | null | boolean)[]>(
    sheet,
    { header: 1, defval: null, raw: false }
  ) as RawSheet;
}

/**
 * Temukan sheet dengan nama yang mengandung keyword (case-insensitive).
 */
export function findSheetName(wb: XLSX.WorkBook, keyword: string): string | null {
  return wb.SheetNames.find((n) =>
    n.toUpperCase().includes(keyword.toUpperCase())
  ) ?? null;
}

/**
 * Parse tanggal dari berbagai format ke string "YYYY-MM-DD".
 * Mendukung Date object, string Excel, dll.
 */
export function toDateString(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toLocaleDateString("en-CA"); // YYYY-MM-DD
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Coba parse berbagai format
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-CA");
    }
  }

  if (typeof value === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Parse angka Rupiah dari berbagai format (string "1.234.567" atau number).
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (typeof value === "string") {
    // Hapus titik ribuan dan ganti koma desimal
    const cleaned = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
