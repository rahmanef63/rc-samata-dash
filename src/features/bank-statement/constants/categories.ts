// SSOT for bank statement category — color, dot accent, Indonesian label.
// Mirrors the union in convex/features/closing/_schema.ts
// (bankStatementCategoryUnion) + the parser map in
// convex/shared/uploadSchemas.ts (BANK_STATEMENT_CATEGORY_MAP).

export const BANK_CATEGORIES = [
  "sales_inflow",
  "expense_outflow",
  "payable_payment",
  "topup_pic",
  "owner_capital",
  "transfer_internal",
  "other",
] as const;

export type BankCategory = (typeof BANK_CATEGORIES)[number];

export const BANK_CATEGORY_LABELS: Record<BankCategory, string> = {
  sales_inflow: "Penjualan Masuk",
  expense_outflow: "Pengeluaran",
  payable_payment: "Bayar Vendor",
  topup_pic: "Topup PIC",
  owner_capital: "Modal Owner",
  transfer_internal: "Transfer Internal",
  other: "Lain-lain",
};

export const BANK_CATEGORY_BADGE_CLS: Record<BankCategory, string> = {
  sales_inflow: "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300",
  expense_outflow: "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300",
  payable_payment: "text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300",
  topup_pic: "text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300",
  owner_capital: "text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300",
  transfer_internal: "text-cyan-700 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300",
  other: "text-gray-700 bg-gray-100 dark:bg-gray-800/60 dark:text-gray-300",
};

export const BANK_CATEGORY_DOT_CLS: Record<BankCategory, string> = {
  sales_inflow: "bg-green-500",
  expense_outflow: "bg-red-500",
  payable_payment: "bg-orange-500",
  topup_pic: "bg-blue-500",
  owner_capital: "bg-purple-500",
  transfer_internal: "bg-cyan-500",
  other: "bg-gray-500",
};

export const BANK_CATEGORY_TAG_OPTIONS = BANK_CATEGORIES.map((c) => ({
  value: c,
  label: BANK_CATEGORY_LABELS[c],
}));
