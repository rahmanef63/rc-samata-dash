// Parse daily summary WhatsApp format.
//
// Example input:
//   *RC Samata (M)*
//   _senin, 29 april 2026_
//   Sales: 3.876.633
//   Online: 2.471.704
//   Cash: 1.404.929
//   Total sales: 132.420.270

import { parseIdDate, parseRupiahLoose } from "../lib/parsing";

export type DailySummaryReport = {
  date: string;            // YYYY-MM-DD
  branchHint?: string;     // e.g. "RC Samata (M)"
  sales: number;           // today's gross sales
  online: number;          // today's online portion
  cash: number;            // today's cash portion
  mtdCumulative: number;   // Total sales (MTD as of date)
};

export function parseDailySummary(text: string): DailySummaryReport | null {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[*_~`]/g, "").trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Branch hint: first line that doesn't contain numbers or "sales"/"cash" etc.
  let branchHint: string | undefined;
  let date: string | null = null;
  let sales = 0;
  let online = 0;
  let cash = 0;
  let mtdCumulative = 0;

  for (const l of lines) {
    if (!date) {
      const d = parseIdDate(l);
      if (d) { date = d; continue; }
    }
    if (!branchHint && /\(M\)|RC|cabang|samata/i.test(l) && !/sales|cash|online|total/i.test(l)) {
      branchHint = l;
      continue;
    }
    const m = l.match(/^([^:=]+)[:=]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase().trim();
    const val = parseRupiahLoose(m[2]);
    if (/^total\s+sales/i.test(key)) { mtdCumulative = val; }
    else if (/^sales/i.test(key)) { sales = val; }
    else if (/^online/i.test(key)) { online = val; }
    else if (/^cash/i.test(key)) { cash = val; }
  }

  if (!date) return null;
  if (sales === 0 && online === 0 && cash === 0) return null;

  return { date, branchHint, sales, online, cash, mtdCumulative };
}
