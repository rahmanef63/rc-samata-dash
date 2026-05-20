// Detect which WhatsApp report format a pasted text matches and
// return a normalized parse result. Single entry-point so the UI
// doesn't have to chain try/catch through 3 parsers.

import { parseTransferOnline, type TransferOnlineReport } from "./parseTransferOnline";
import { parseDailySummary, type DailySummaryReport } from "./parseDailySummary";
import { parseMonthlyTally, type MonthlyTallyReport } from "./parseMonthlyTally";

export type WhatsAppReport =
  | ({ kind: "transferOnline" } & TransferOnlineReport)
  | ({ kind: "dailySummary" } & DailySummaryReport)
  | ({ kind: "monthlyTally" } & MonthlyTallyReport);

export function parseWhatsAppReport(text: string): WhatsAppReport | null {
  // Order of detection matters: transferOnline header is the most
  // specific, dailySummary has weekday + 3 Rp lines, monthlyTally has
  // the "N. xxx/yyy/zzz" rows.
  if (/transfer.*online.*owner/i.test(text)) {
    const r = parseTransferOnline(text);
    if (r) return { kind: "transferOnline", ...r };
  }
  if (/total\s+sales/i.test(text) && /\b(sales|online|cash)\b/i.test(text)) {
    const r = parseDailySummary(text);
    if (r) return { kind: "dailySummary", ...r };
  }
  if (/\d+\.\s+[\d.,]+\s*\//.test(text)) {
    const r = parseMonthlyTally(text);
    if (r) return { kind: "monthlyTally", ...r };
  }
  // Fallback: try each
  const t1 = parseTransferOnline(text);
  if (t1) return { kind: "transferOnline", ...t1 };
  const t2 = parseDailySummary(text);
  if (t2) return { kind: "dailySummary", ...t2 };
  const t3 = parseMonthlyTally(text);
  if (t3) return { kind: "monthlyTally", ...t3 };
  return null;
}

export { parseTransferOnline, parseDailySummary, parseMonthlyTally };
export type { TransferOnlineReport, DailySummaryReport, MonthlyTallyReport };
