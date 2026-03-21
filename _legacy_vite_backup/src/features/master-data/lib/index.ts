import type { Vendor, IncomeChannel, ExpenseCategory } from "@/shared/types";

export const mockVendors: Vendor[] = [
  { id: "v-1", name: "CV Bahan Pokok Jaya", type: "food_supplier", phone: "0812-3456-7890", notes: "Supplier ayam & tepung", isActive: true },
  { id: "v-2", name: "PT Minyak Goreng Nusantara", type: "food_supplier", phone: "0813-9876-5432", notes: "Minyak goreng curah", isActive: true },
  { id: "v-3", name: "UD Sayur Segar", type: "food_supplier", phone: "0856-1234-5678", notes: "Sayur & bumbu dapur", isActive: true },
  { id: "v-4", name: "PLN Prepaid", type: "utility", phone: "-", notes: "Token listrik bulanan", isActive: true },
  { id: "v-5", name: "Indihome", type: "utility", phone: "147", notes: "WiFi outlet", isActive: true },
  { id: "v-6", name: "CV Cleaning Service", type: "service", phone: "0878-5555-1234", notes: "Jasa kebersihan mingguan", isActive: true },
  { id: "v-7", name: "BPJS Ketenagakerjaan", type: "payroll", phone: "-", notes: "Iuran karyawan", isActive: true },
];

export const mockChannels: IncomeChannel[] = [
  { id: "ch-1", name: "Cash (Tunai)", type: "cash", isSettlementDelayed: false },
  { id: "ch-2", name: "Transfer Bank", type: "transfer", isSettlementDelayed: false },
  { id: "ch-3", name: "GoFood", type: "gofood", isSettlementDelayed: true },
  { id: "ch-4", name: "GrabFood", type: "grabfood", isSettlementDelayed: true },
  { id: "ch-5", name: "ShopeeFood", type: "shopeefood", isSettlementDelayed: true },
  { id: "ch-6", name: "Dine-in", type: "dine_in", isSettlementDelayed: false },
  { id: "ch-7", name: "Take Away", type: "take_away", isSettlementDelayed: false },
];

export const mockExpenseCategories: ExpenseCategory[] = [
  { id: "ec-1", name: "Bahan Baku", type: "cogs" },
  { id: "ec-2", name: "Utilitas (Listrik, Air, Gas)", type: "utility" },
  { id: "ec-3", name: "Gaji Support", type: "salary_support" },
  { id: "ec-4", name: "BPJS", type: "bpjs" },
  { id: "ec-5", name: "Maintenance & Perbaikan", type: "maintenance" },
  { id: "ec-6", name: "Marketing & Promo", type: "marketing" },
  { id: "ec-7", name: "Fee Platform", type: "fee" },
  { id: "ec-8", name: "Lain-lain", type: "other" },
];

export const vendorTypeLabels: Record<string, string> = {
  food_supplier: "Supplier Makanan",
  utility: "Utilitas",
  service: "Jasa",
  payroll: "Payroll",
  misc: "Lain-lain",
};

export const channelTypeLabels: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer",
  gofood: "GoFood",
  grabfood: "GrabFood",
  shopeefood: "ShopeeFood",
  dine_in: "Dine-in",
  take_away: "Take Away",
  other: "Lainnya",
};

export const expenseCategoryTypeLabels: Record<string, string> = {
  cogs: "COGS / Bahan Baku",
  utility: "Utilitas",
  salary_support: "Gaji Support",
  bpjs: "BPJS",
  maintenance: "Maintenance",
  marketing: "Marketing",
  fee: "Fee Platform",
  other: "Lain-lain",
};
