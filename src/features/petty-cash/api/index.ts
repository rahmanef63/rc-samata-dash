// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const usePettyCashRequests = (branchId: string) =>
  useQuery(api.features.pettyCash.queries.listByBranch, { branchId: branchId as any });

export const usePettyCashRequest = (id: string) =>
  useQuery(api.features.pettyCash.queries.getById, { id: id as any });

export const usePettyCashRequestsByStatus = (status: "requested" | "approved" | "rejected" | "disbursed" | "closed") =>
  useQuery(api.features.pettyCash.queries.listByStatus, { status });

export const useCreatePettyCashRequest = () => useMutation(api.features.pettyCash.mutations.create);
export const useUpdatePettyCashRequest = () => useMutation(api.features.pettyCash.mutations.update);
export const useDeletePettyCashRequest = () => useMutation(api.features.pettyCash.mutations.remove);
