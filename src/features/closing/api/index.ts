// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useGetClosingByDate = (branchId: string, businessDate: string) =>
  useQuery(api.features.closing.queries.getClosingByDate, {
    branchId: branchId as any,
    businessDate,
  });

export const useListClosings = (branchId: string) =>
  useQuery(api.features.closing.queries.listClosings, { branchId: branchId as any });

export const useCreateClosing = () => useMutation(api.features.closing.mutations.createClosing);
export const useUpdateClosing = () => useMutation(api.features.closing.mutations.updateClosing);

export const useListTransfers = (branchId: string) =>
  useQuery(api.features.closing.queries.listTransfers, { branchId: branchId as any });

export const useCreateTransfer = () => useMutation(api.features.closing.mutations.createTransfer);
export const useDeleteTransfer = () => useMutation(api.features.closing.mutations.removeTransfer);
