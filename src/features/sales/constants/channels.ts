// SSOT for income/sales channels.
// Mirrors convex/shared/validators.ts:incomeChannelTypeValidator.
//
// Two distinct concepts both live here so the UI never invents its own
// label table:
//   - SALES_CHANNELS: settle-delayed online platforms used in
//     productSales.channel + bankStatementEntries.channel
//   - INCOME_CHANNELS: full union including cash/transfer/dine_in etc.

export const SALES_CHANNELS = [
  "gofood",
  "grabfood",
  "shopeefood",
  "ovo",
  "dana",
  "qris",
  "tambahan",
] as const;

export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const INCOME_CHANNELS = [
  "cash",
  "transfer",
  "gofood",
  "grabfood",
  "shopeefood",
  "ovo",
  "dana",
  "qris",
  "dine_in",
  "take_away",
  "other",
] as const;

export type IncomeChannel = (typeof INCOME_CHANNELS)[number];

export const CHANNEL_LABELS: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer Bank",
  gofood: "GoFood",
  grabfood: "GrabFood",
  shopeefood: "ShopeeFood",
  ovo: "Ovo",
  dana: "Dana",
  qris: "QRIS",
  dine_in: "Dine-in",
  take_away: "Take-away",
  tambahan: "Tambahan",
  other: "Lainnya",
  all: "Semua",
  bank_fee: "Biaya Bank",
};

// Settlement-delayed = uang nyangkut di platform sebelum settle
// ke rekening owner (gak realtime). Cocok untuk filter & alert.
export const SETTLEMENT_DELAYED_CHANNELS = new Set<string>([
  "gofood", "grabfood", "shopeefood", "ovo", "dana", "qris",
]);

export function labelChannel(channel: string | null | undefined): string {
  if (!channel) return CHANNEL_LABELS.other;
  return CHANNEL_LABELS[channel] ?? channel;
}
