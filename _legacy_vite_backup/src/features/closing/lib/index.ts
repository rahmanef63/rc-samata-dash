import type { DailyClosing, OwnerTransfer } from "@/shared/types";

export const mockClosings: DailyClosing[] = [
  { id: "cl-1", businessDate: "2024-05-24", openingCash: 500000, cashSales: 9450000, nonCashSales: 7400000, expensesPaidCash: 1280000, expectedCash: 8670000, actualCash: 8650000, difference: -20000, status: "open", submittedBy: "Admin Outlet", submittedAt: "" },
  { id: "cl-2", businessDate: "2024-05-23", openingCash: 500000, cashSales: 8200000, nonCashSales: 6500000, expensesPaidCash: 980000, expectedCash: 7720000, actualCash: 7720000, difference: 0, status: "verified", submittedBy: "Admin Outlet", submittedAt: "2024-05-23 22:30" },
  { id: "cl-3", businessDate: "2024-05-22", openingCash: 500000, cashSales: 7800000, nonCashSales: 5900000, expensesPaidCash: 1150000, expectedCash: 7150000, actualCash: 7100000, difference: -50000, status: "submitted", submittedBy: "Admin Outlet", submittedAt: "2024-05-22 22:15" },
  { id: "cl-4", businessDate: "2024-05-21", openingCash: 500000, cashSales: 9100000, nonCashSales: 7200000, expensesPaidCash: 1430000, expectedCash: 8170000, actualCash: 8170000, difference: 0, status: "verified", submittedBy: "Admin Outlet", submittedAt: "2024-05-21 22:45" },
];

export const mockTransfers: OwnerTransfer[] = [
  { id: "ot-1", closingId: "cl-2", transferDate: "2024-05-23", direction: "branch_to_owner", purpose: "night_transfer", amount: 7220000, referenceNo: "TRF-230524-01", status: "completed" },
  { id: "ot-2", closingId: null, transferDate: "2024-05-23", direction: "owner_to_branch", purpose: "petty_cash_topup", amount: 500000, referenceNo: "TRF-230524-02", status: "completed" },
  { id: "ot-3", closingId: "cl-3", transferDate: "2024-05-22", direction: "branch_to_owner", purpose: "night_transfer", amount: 6600000, referenceNo: "TRF-220524-01", status: "completed" },
  { id: "ot-4", closingId: null, transferDate: "2024-05-22", direction: "owner_to_branch", purpose: "payable_payment_fund", amount: 3200000, referenceNo: "TRF-220524-02", status: "completed" },
  { id: "ot-5", closingId: "cl-4", transferDate: "2024-05-21", direction: "branch_to_owner", purpose: "night_transfer", amount: 7670000, referenceNo: "TRF-210524-01", status: "completed" },
];

export const purposeLabels: Record<string, string> = {
  night_transfer: "Setoran Malam",
  petty_cash_topup: "Top-up Petty Cash",
  payable_payment_fund: "Dana Bayar Hutang",
  adjustment: "Adjustment",
};
