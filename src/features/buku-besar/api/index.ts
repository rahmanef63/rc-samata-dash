import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useBukuBesar() {
  return useQuery(api.features.bukuBesar.queries.listBukuBesar, { limit: 5000 });
}

export function useBukuBesarCounts() {
  return useQuery(api.features.bukuBesar.queries.countBukuBesar, {});
}

export function useBulkPatch() {
  return useMutation(api.features.bukuBesar.mutations.bulkPatch);
}

export function useBulkDelete() {
  return useMutation(api.features.bukuBesar.mutations.bulkDelete);
}
