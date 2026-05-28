export const salesChannels = ["CASH (TUNAI)", "GOFOOD", "GRABFOOD", "SHOPEEFOOD", "DINE-IN", "TAKE AWAY"] as const;
export const subTabs = ["PENJUALAN HARIAN", "SETORAN MALAM", "SETTLEMENT MITRA"] as const;

export const formatRpFull = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;
