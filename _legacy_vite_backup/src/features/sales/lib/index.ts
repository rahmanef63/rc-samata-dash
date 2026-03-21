import type { DailySale } from "@/shared/types";

export const salesChannels = ["CASH (TUNAI)", "GOFOOD", "GRABFOOD", "SHOPEEFOOD", "DINE-IN", "TAKE AWAY"] as const;
export const subTabs = ["PENJUALAN HARIAN", "SETORAN MALAM", "SETTLEMENT MITRA"] as const;

export const mockDailySales: DailySale[] = [
  { id: "ds-1", businessDate: "2024-05-24", channelId: "ch-1", channelName: "Cash (Tunai)", grossAmount: 4250000, platformFee: 0, promoCost: 0, netAmount: 4250000, cashReceivedAmount: 4250000, settlementDate: "2024-05-24", referenceNo: "CASH-240524", status: "recorded" },
  { id: "ds-2", businessDate: "2024-05-24", channelId: "ch-3", channelName: "GoFood", grossAmount: 3800000, platformFee: 760000, promoCost: 190000, netAmount: 2850000, cashReceivedAmount: 0, settlementDate: null, referenceNo: "GF-240524", status: "pending_settlement" },
  { id: "ds-3", businessDate: "2024-05-24", channelId: "ch-4", channelName: "GrabFood", grossAmount: 2100000, platformFee: 420000, promoCost: 105000, netAmount: 1575000, cashReceivedAmount: 0, settlementDate: null, referenceNo: "GB-240524", status: "pending_settlement" },
  { id: "ds-4", businessDate: "2024-05-24", channelId: "ch-5", channelName: "ShopeeFood", grossAmount: 1500000, platformFee: 300000, promoCost: 75000, netAmount: 1125000, cashReceivedAmount: 0, settlementDate: "2024-05-26", referenceNo: "SF-240524", status: "settled" },
  { id: "ds-5", businessDate: "2024-05-24", channelId: "ch-6", channelName: "Dine-in", grossAmount: 5200000, platformFee: 0, promoCost: 0, netAmount: 5200000, cashReceivedAmount: 5200000, settlementDate: "2024-05-24", referenceNo: "DI-240524", status: "recorded" },
  { id: "ds-6", businessDate: "2024-05-23", channelId: "ch-1", channelName: "Cash (Tunai)", grossAmount: 3900000, platformFee: 0, promoCost: 0, netAmount: 3900000, cashReceivedAmount: 3900000, settlementDate: "2024-05-23", referenceNo: "CASH-240523", status: "recorded" },
  { id: "ds-7", businessDate: "2024-05-23", channelId: "ch-3", channelName: "GoFood", grossAmount: 4100000, platformFee: 820000, promoCost: 205000, netAmount: 3075000, cashReceivedAmount: 3075000, settlementDate: "2024-05-25", referenceNo: "GF-240523", status: "settled" },
];

export const formatRpFull = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;
