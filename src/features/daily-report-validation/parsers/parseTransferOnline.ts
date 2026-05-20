// Parse "Transfer Online Owner" WhatsApp format.
//
// Example input:
//   *Transfer Online Owner 29 april 2026*
//   Gojek : 133.273
//   Grab: 420.360
//   Shopee: 84.000
//   Ovo: 1.834.071
//   Total: 2.471.704
//
// Output: { date, channels: {gojek, grab, shopee, ovo, ...}, total }

import { parseIdDate, parseRupiahLoose } from "../lib/parsing";

export type TransferOnlineReport = {
  date: string; // YYYY-MM-DD
  channels: Record<string, number>;
  total: number;
  rawHeader: string;
};

const CHANNEL_PATTERN = /^\s*([A-Za-z][A-Za-z\s]*?)\s*[:=]\s*(.+)$/i;

const ALIAS_NORMALIZE: Record<string, string> = {
  gojek: "gofood",
  gofood: "gofood",
  "go food": "gofood",
  grab: "grabfood",
  grabfood: "grabfood",
  "grab food": "grabfood",
  shopee: "shopeefood",
  shopeefood: "shopeefood",
  "shopee food": "shopeefood",
  ovo: "ovo",
  dana: "dana",
  qris: "qris",
};

export function parseTransferOnline(text: string): TransferOnlineReport | null {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[*_~`]/g, "").trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Header: "Transfer Online Owner 29 april 2026"
  let date: string | null = null;
  let header = "";
  for (const l of lines) {
    if (/transfer.*online.*owner/i.test(l)) {
      header = l;
      date = parseIdDate(l);
      break;
    }
  }
  if (!date) return null;

  const channels: Record<string, number> = {};
  let total = 0;
  for (const l of lines) {
    const m = l.match(CHANNEL_PATTERN);
    if (!m) continue;
    const rawKey = m[1].toLowerCase().trim();
    const rawVal = m[2];
    if (/^total/i.test(rawKey)) {
      total = parseRupiahLoose(rawVal);
      continue;
    }
    const normalized = ALIAS_NORMALIZE[rawKey];
    if (!normalized) continue;
    channels[normalized] = parseRupiahLoose(rawVal);
  }

  if (Object.keys(channels).length === 0) return null;

  return { date, channels, total, rawHeader: header };
}
