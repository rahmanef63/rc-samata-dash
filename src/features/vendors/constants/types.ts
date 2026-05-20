// SSOT for vendor type — labels, badge classes, ordering.
// Mirrors convex/shared/validators.ts:vendorTypeValidator + masterData
// _schema.ts:vendors.type union.

export const VENDOR_TYPES = ["food_supplier", "utility", "service", "payroll", "misc"] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  food_supplier: "Food Supplier",
  utility: "Utilitas",
  service: "Jasa",
  payroll: "Gaji",
  misc: "Lain-lain",
};

export const VENDOR_TYPE_BADGE_CLS: Record<VendorType, string> = {
  food_supplier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  utility: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  service: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  payroll: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  misc: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
};

// Used by filter dropdowns; "all" sentinel intentionally first.
export const VENDOR_TYPE_FILTER_OPTIONS = [
  { key: "all", label: "Semua tipe" },
  ...VENDOR_TYPES.map((t) => ({ key: t, label: VENDOR_TYPE_LABELS[t] })),
] as const;
