import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useGetClosingByDate = (branchId: string, businessDate: string) =>
  useQuery(api.features.closing.queries.getClosingByDate,
    (branchId && businessDate) ? {
      branchId: branchId as Id<"branches">,
      businessDate,
    } : "skip"
  );

export const useListClosings = (branchId: string) =>
  useQuery(api.features.closing.queries.listClosings, branchId ? { branchId: branchId as Id<"branches"> } : "skip");

export const useCreateClosing = () => useMutation(api.features.closing.mutations.createClosing);
export const useUpdateClosing = () => useMutation(api.features.closing.mutations.updateClosing);

export const useListTransfers = (branchId: string) =>
  useQuery(api.features.closing.queries.listTransfers, branchId ? { branchId: branchId as Id<"branches"> } : "skip");

export const useCreateTransfer = () => useMutation(api.features.closing.mutations.createTransfer);
export const useDeleteTransfer = () => useMutation(api.features.closing.mutations.removeTransfer);
