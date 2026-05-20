// Compare a parsed WhatsApp report against system-side numbers.
// User chose EXACT MATCH tolerance (Rp 0) — any difference is flagged.

import type { WhatsAppReport } from "../parsers";

export type DiffRow = {
  label: string;
  whatsApp: number;
  system: number;
  diff: number;       // whatsApp - system
  match: boolean;     // diff === 0
};

export type DiffResult = {
  matchedAll: boolean;
  rows: DiffRow[];
};

type SystemSnapshot = {
  sales?: number;
  cashSales?: number;
  nonCashSales?: number;
  onlineFromProductSales?: number;
  channelTotals?: Record<string, number>;
  bankInflowByChannel?: Record<string, number>;
  customerCount?: number;
  mtdCumulative?: number;
};

const ALIAS_TO_CHANNEL: Record<string, string> = {
  gofood: "gofood", gojek: "gofood",
  grabfood: "grabfood", grab: "grabfood",
  shopeefood: "shopeefood", shopee: "shopeefood",
  ovo: "ovo",
  dana: "dana",
  qris: "qris",
};

export function compareReport(report: WhatsAppReport, snapshot: SystemSnapshot): DiffResult {
  const rows: DiffRow[] = [];
  const push = (label: string, whatsApp: number, system: number) => {
    rows.push({ label, whatsApp, system, diff: whatsApp - system, match: whatsApp === system });
  };

  if (report.kind === "transferOnline") {
    for (const [waKey, val] of Object.entries(report.channels)) {
      const ch = ALIAS_TO_CHANNEL[waKey] ?? waKey;
      // Prefer bank-side number (actual settlement). Fall back to
      // productSales channel total when no statement uploaded yet.
      const sys =
        snapshot.bankInflowByChannel?.[ch] ??
        snapshot.channelTotals?.[ch] ?? 0;
      push(`Channel ${ch}`, val, sys);
    }
    if (report.total) {
      const sysTotal = Object.values(report.channels).reduce((s, _v) => s, 0); // dummy to silence ts
      // Actual system total for online sum:
      const sysOnline =
        Object.entries(snapshot.bankInflowByChannel ?? {})
          .filter(([k]) => ["gofood", "grabfood", "shopeefood", "ovo", "dana", "qris"].includes(k))
          .reduce((s, [, v]) => s + v, 0) ||
        (snapshot.onlineFromProductSales ?? 0);
      // sysTotal not used; suppress lint with void.
      void sysTotal;
      push("Total Online", report.total, sysOnline);
    }
  } else if (report.kind === "dailySummary") {
    push("Sales hari ini", report.sales, snapshot.sales ?? 0);
    const sysOnline =
      Object.entries(snapshot.bankInflowByChannel ?? {})
        .filter(([k]) => ["gofood", "grabfood", "shopeefood", "ovo", "dana", "qris"].includes(k))
        .reduce((s, [, v]) => s + v, 0) ||
      (snapshot.onlineFromProductSales ?? 0);
    push("Online", report.online, sysOnline);
    push("Cash", report.cash, snapshot.cashSales ?? 0);
    if (report.mtdCumulative) push("Total sales (MTD)", report.mtdCumulative, snapshot.mtdCumulative ?? 0);
  } else if (report.kind === "monthlyTally") {
    // For monthly tally, comparison only meaningful per-day. UI handles
    // it by mapping each MonthlyTallyDayRow to its own diff. Here we
    // return aggregate so the table view can show a summary if needed.
    // (UI uses parseMonthlyTally separately with per-day queries.)
  }

  return { matchedAll: rows.every((r) => r.match), rows };
}
