// Convex hooks for vendors feature.
// Thin wrappers so feature consumers (pages, components) don't reach
// into `convex/_generated/api` directly.

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useVendorsWithAggregate() {
  return useQuery(api.features.payables.queries.listVendorsWithAggregate, {});
}

export function useVendorDetail(vendorId: Id<"vendors"> | undefined) {
  return useQuery(
    api.features.payables.queries.getVendorDetail,
    vendorId ? { vendorId } : "skip",
  );
}

export function useRemoveVendorAlias() {
  return useMutation(api.features.payables.mutations.removeVendorAlias);
}
