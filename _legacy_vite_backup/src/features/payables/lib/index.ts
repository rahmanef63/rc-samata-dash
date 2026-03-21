import type { Payable } from "@/shared/types";

export const mockPayables: Payable[] = [
  { id: "pay-1", expenseId: "exp-1", vendorId: "v-1", vendorName: "CV Bahan Pokok Jaya", invoiceDate: "2024-05-24", dueDate: "2024-05-31", amount: 2500000, paidAmount: 0, status: "open", description: "Ayam potong 50kg + Tepung 25kg", agingDays: 0 },
  { id: "pay-2", expenseId: "exp-3", vendorId: "v-2", vendorName: "PT Minyak Goreng Nusantara", invoiceDate: "2024-05-15", dueDate: "2024-05-22", amount: 1200000, paidAmount: 600000, status: "partial", description: "Minyak goreng 40 liter", agingDays: 9 },
  { id: "pay-3", expenseId: "exp-x1", vendorId: "v-3", vendorName: "UD Sayur Segar", invoiceDate: "2024-05-01", dueDate: "2024-05-08", amount: 950000, paidAmount: 0, status: "overdue", description: "Sayur & bumbu minggu 1 Mei", agingDays: 23 },
  { id: "pay-4", expenseId: "exp-x2", vendorId: "v-1", vendorName: "CV Bahan Pokok Jaya", invoiceDate: "2024-04-28", dueDate: "2024-05-05", amount: 3200000, paidAmount: 3200000, status: "paid", description: "Ayam potong 80kg", agingDays: 0 },
  { id: "pay-5", expenseId: "exp-x3", vendorId: "v-2", vendorName: "PT Minyak Goreng Nusantara", invoiceDate: "2024-05-10", dueDate: "2024-05-17", amount: 800000, paidAmount: 0, status: "overdue", description: "Minyak goreng 25 liter", agingDays: 14 },
];
