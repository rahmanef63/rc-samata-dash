import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useGetClosingByDate = (businessDate: string) =>
  useQuery(api.features.closing.queries.getClosingByDate,
    businessDate ? { businessDate } : "skip"
  );

export const useListClosings = () =>
  useQuery(api.features.closing.queries.listClosings, {});

export const useCreateClosing = () => useMutation(api.features.closing.mutations.createClosing);
export const useUpdateClosing = () => useMutation(api.features.closing.mutations.updateClosing);

export const useListTransfers = () =>
  useQuery(api.features.closing.queries.listTransfers, {});

export const useCreateTransfer = () => useMutation(api.features.closing.mutations.createTransfer);
export const useUpdateTransfer = () => useMutation(api.features.closing.mutations.updateTransfer);
export const useDeleteTransfer = () => useMutation(api.features.closing.mutations.removeTransfer);
