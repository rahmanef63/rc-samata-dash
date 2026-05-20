import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useRiwayatTransaksi(branchId: Id<"branches"> | undefined) {
  return useQuery(
    api.features.laporanPic.queries.listRiwayatTransaksi,
    branchId ? { branchId, limit: 2000 } : "skip",
  );
}

export function useAnomalyReceipts(branchId: Id<"branches"> | undefined) {
  return useQuery(
    api.features.laporanPic.queries.listAnomalyReceipts,
    branchId ? { branchId } : "skip",
  );
}

export function useMatchingReport(branchId: Id<"branches"> | undefined) {
  return useQuery(
    api.features.laporanPic.queries.listMatchingReport,
    branchId ? { branchId } : "skip",
  );
}

export function useImportLong() {
  return useMutation(api.features.laporanPic.mutations.importLaporanPicLong);
}

export function useImportPivot() {
  return useMutation(api.features.laporanPic.mutations.importLaporanPicPivot);
}
