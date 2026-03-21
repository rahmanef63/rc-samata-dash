import type { PettyCashRequest } from "@/shared/types";

export const mockPettyCashRequests: PettyCashRequest[] = [
  { id: "pc-1", requestDate: "2024-05-24", requestedBy: "Manager Sudirman", purposeCategory: "Utilitas", requestedAmount: 200000, approvedAmount: 200000, actualAmount: 185000, status: "closed", notes: "Token listrik prepaid", hasAttachment: true },
  { id: "pc-2", requestDate: "2024-05-24", requestedBy: "Admin Outlet", purposeCategory: "Maintenance", requestedAmount: 350000, approvedAmount: 350000, actualAmount: 0, status: "disbursed", notes: "Perbaikan keran air dapur", hasAttachment: false },
  { id: "pc-3", requestDate: "2024-05-23", requestedBy: "Admin Outlet", purposeCategory: "Bahan Baku", requestedAmount: 450000, approvedAmount: 0, actualAmount: 0, status: "requested", notes: "Emergency stok bahan baku", hasAttachment: false },
  { id: "pc-4", requestDate: "2024-05-23", requestedBy: "Manager Sudirman", purposeCategory: "Utilitas", requestedAmount: 150000, approvedAmount: 150000, actualAmount: 142000, status: "closed", notes: "Galon air & gas elpiji", hasAttachment: true },
  { id: "pc-5", requestDate: "2024-05-22", requestedBy: "Admin Outlet", purposeCategory: "Lain-lain", requestedAmount: 100000, approvedAmount: 0, actualAmount: 0, status: "rejected", notes: "Dekorasi outlet - ditolak", hasAttachment: false },
  { id: "pc-6", requestDate: "2024-05-22", requestedBy: "Admin Outlet", purposeCategory: "Maintenance", requestedAmount: 500000, approvedAmount: 500000, actualAmount: 480000, status: "closed", notes: "Service AC unit dapur", hasAttachment: true },
];

export const pettyCashBalance = {
  totalDisbursed: 1200000,
  totalUsed: 807000,
  remaining: 393000,
};
