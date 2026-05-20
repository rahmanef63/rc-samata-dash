// Parse monthly tally WhatsApp format.
//
// Example input:
//   _*SALES RC SAMATA BULAN APRIL*_
//   Sales/total sales/customer
//
//   1. 4.712.936/4.712.936/178
//   2. 5.732.764/10.455.700/175
//   ...
//   29. 3.876.633/132.410.270/118

import { parseRupiahLoose } from "../lib/parsing";

const ID_MONTH_TO_NUMBER: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

export type MonthlyTallyDayRow = {
  day: number;
  date?: string;       // resolved YYYY-MM-DD if month + year inferable
  sales: number;
  mtdCumulative: number;
  customerCount: number;
};

export type MonthlyTallyReport = {
  month?: number;      // 1-12
  year?: number;
  rawHeader: string;
  rows: MonthlyTallyDayRow[];
};

const ROW_PATTERN = /^(\d{1,2})\.\s+([\d.,]+)\s*[\/|]\s*([\d.,]+)\s*[\/|]\s*(\d+)/;

export function parseMonthlyTally(text: string): MonthlyTallyReport | null {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[*_~`]/g, "").trim()).filter(Boolean);

  let month: number | undefined;
  let year: number | undefined;
  let rawHeader = "";

  for (const l of lines) {
    if (/sales.*samata.*bulan/i.test(l) || /bulan\s+\w+/i.test(l)) {
      rawHeader = l;
      const lower = l.toLowerCase();
      for (const [name, num] of Object.entries(ID_MONTH_TO_NUMBER)) {
        if (lower.includes(name)) { month = num; break; }
      }
      const yearMatch = l.match(/(20\d{2})/);
      if (yearMatch) year = Number(yearMatch[1]);
      break;
    }
  }
  // Default year to current if header didn't carry one.
  if (month && !year) year = new Date().getFullYear();

  const rows: MonthlyTallyDayRow[] = [];
  for (const l of lines) {
    const m = l.match(ROW_PATTERN);
    if (!m) continue;
    const day = Number(m[1]);
    if (!Number.isFinite(day) || day < 1 || day > 31) continue;
    rows.push({
      day,
      date: month && year ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : undefined,
      sales: parseRupiahLoose(m[2]),
      mtdCumulative: parseRupiahLoose(m[3]),
      customerCount: Number(m[4]) || 0,
    });
  }

  if (rows.length === 0) return null;
  return { month, year, rawHeader, rows };
}
