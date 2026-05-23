import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useRiwayatTransaksi() {
  return useQuery(api.features.laporanPic.queries.listRiwayatTransaksi, { limit: 2000 });
}

export function useAnomalyReceipts() {
  return useQuery(api.features.laporanPic.queries.listAnomalyReceipts, {});
}

export function useMatchingReport() {
  return useQuery(api.features.laporanPic.queries.listMatchingReport, {});
}

export function useImportLong() {
  return useMutation(api.features.laporanPic.mutations.importLaporanPicLong);
}

export function useImportPivot() {
  return useMutation(api.features.laporanPic.mutations.importLaporanPicPivot);
}
