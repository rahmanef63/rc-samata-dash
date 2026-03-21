import type { Expense } from "@/shared/types";

export const mockExpenses: Expense[] = [
  { id: "exp-1", expenseDate: "2024-05-24", categoryId: "ec-1", categoryName: "Bahan Baku", vendorId: "v-1", vendorName: "CV Bahan Pokok Jaya", amount: 2500000, description: "Ayam potong 50kg + Tepung 25kg", paymentSource: "payable", status: "approved", hasAttachment: true },
  { id: "exp-2", expenseDate: "2024-05-24", categoryId: "ec-2", categoryName: "Utilitas", vendorId: "v-4", vendorName: "PLN Prepaid", amount: 850000, description: "Token listrik bulan Mei", paymentSource: "owner_direct", status: "paid", hasAttachment: true },
  { id: "exp-3", expenseDate: "2024-05-23", categoryId: "ec-1", categoryName: "Bahan Baku", vendorId: "v-2", vendorName: "PT Minyak Goreng Nusantara", amount: 1200000, description: "Minyak goreng 40 liter", paymentSource: "payable", status: "submitted", hasAttachment: true },
  { id: "exp-4", expenseDate: "2024-05-23", categoryId: "ec-5", categoryName: "Maintenance", vendorId: null, vendorName: null, amount: 350000, description: "Perbaikan keran air dapur", paymentSource: "petty_cash", status: "paid", hasAttachment: false },
  { id: "exp-5", expenseDate: "2024-05-22", categoryId: "ec-2", categoryName: "Utilitas", vendorId: "v-5", vendorName: "Indihome", amount: 450000, description: "WiFi bulan Mei", paymentSource: "owner_direct", status: "approved", hasAttachment: true },
  { id: "exp-6", expenseDate: "2024-05-22", categoryId: "ec-4", categoryName: "BPJS", vendorId: "v-7", vendorName: "BPJS Ketenagakerjaan", amount: 680000, description: "Iuran BPJS 4 karyawan", paymentSource: "owner_direct", status: "paid", hasAttachment: true },
  { id: "exp-7", expenseDate: "2024-05-21", categoryId: "ec-1", categoryName: "Bahan Baku", vendorId: "v-3", vendorName: "UD Sayur Segar", amount: 780000, description: "Sayur, bumbu, sambal", paymentSource: "petty_cash", status: "paid", hasAttachment: true },
  { id: "exp-8", expenseDate: "2024-05-21", categoryId: "ec-8", categoryName: "Lain-lain", vendorId: null, vendorName: null, amount: 150000, description: "Galon air minum", paymentSource: "petty_cash", status: "draft", hasAttachment: false },
];

export const paymentSourceLabels: Record<string, string> = {
  owner_direct: "Owner Direct",
  petty_cash: "Petty Cash",
  payable: "Piutang / Hutang",
};
