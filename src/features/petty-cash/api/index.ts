import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const usePettyCashRequests = () =>
  useQuery(api.features.pettyCash.queries.listByBranch, {});

export const usePettyCashRequest = (id: string) =>
  useQuery(api.features.pettyCash.queries.getById, id ? { id: id as Id<"pettyCashRequests"> } : "skip");

export const usePettyCashRequestsByStatus = (status: "requested" | "approved" | "rejected" | "disbursed" | "closed") =>
  useQuery(api.features.pettyCash.queries.listByStatus, status ? { status } : "skip");

export const useCreatePettyCashRequest = () => useMutation(api.features.pettyCash.mutations.create);
export const useUpdatePettyCashRequest = () => useMutation(api.features.pettyCash.mutations.update);
export const useDeletePettyCashRequest = () => useMutation(api.features.pettyCash.mutations.remove);
