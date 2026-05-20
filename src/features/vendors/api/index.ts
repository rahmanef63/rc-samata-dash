// Convex hooks for vendors feature.
// Thin wrappers so feature consumers (pages, components) don't reach
// into `convex/_generated/api` directly.

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useVendorsWithAggregate(branchId: Id<"branches"> | undefined) {
  return useQuery(
    api.features.payables.queries.listVendorsWithAggregate,
    branchId ? { branchId } : "skip",
  );
}

export function useVendorDetail(
  vendorId: Id<"vendors"> | undefined,
  branchId: Id<"branches"> | undefined,
) {
  return useQuery(
    api.features.payables.queries.getVendorDetail,
    vendorId && branchId ? { vendorId, branchId } : "skip",
  );
}

export function useRemoveVendorAlias() {
  return useMutation(api.features.payables.mutations.removeVendorAlias);
}
