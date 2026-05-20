// SSOT for Buku Besar row kind — label + color used by chip filter +
// per-row badge. Mirror of `kind` field in convex listBukuBesar query.

export const KIND_ORDER = ["tagihan", "bayar", "setoran", "transfer", "anomali"] as const;
export type RowKind = (typeof KIND_ORDER)[number];

export const KIND_LABEL: Record<RowKind, string> = {
  tagihan: "Tagihan",
  bayar: "Bayar",
  setoran: "Setoran",
  transfer: "Transfer Owner",
  anomali: "Anomali",
};

export const KIND_CLS: Record<RowKind, string> = {
  tagihan: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  bayar: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  setoran: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  transfer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  anomali: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export const DIRECTION_LABEL: Record<string, string> = {
  in: "Masuk",
  out: "Keluar",
  transfer: "Transfer",
};
