import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useBukuBesar(branchId: Id<"branches"> | undefined) {
  return useQuery(
    api.features.bukuBesar.queries.listBukuBesar,
    branchId ? { branchId, limit: 5000 } : "skip",
  );
}

export function useBukuBesarCounts(branchId: Id<"branches"> | undefined) {
  return useQuery(
    api.features.bukuBesar.queries.countBukuBesar,
    branchId ? { branchId } : "skip",
  );
}

export function useBulkPatch() {
  return useMutation(api.features.bukuBesar.mutations.bulkPatch);
}

export function useBulkDelete() {
  return useMutation(api.features.bukuBesar.mutations.bulkDelete);
}
