import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const usePayables = () =>
  useQuery(api.features.payables.queries.listByBranch, {});

export const usePayable = (id: string) =>
  useQuery(api.features.payables.queries.getById, id ? { id: id as Id<"payables"> } : "skip");

export const usePayablesByVendor = (vendorId: string) =>
  useQuery(api.features.payables.queries.listByVendor, vendorId ? { vendorId: vendorId as Id<"vendors"> } : "skip");

export const usePayablePayments = (payableId: string) =>
  useQuery(api.features.payables.queries.listPayments, payableId ? { payableId: payableId as Id<"payables"> } : "skip");

export const useCreatePayable = () => useMutation(api.features.payables.mutations.create);
export const useUpdatePayable = () => useMutation(api.features.payables.mutations.update);
export const useDeletePayable = () => useMutation(api.features.payables.mutations.remove);

export const useAddPayablePayment = () => useMutation(api.features.payables.mutations.addPayment);
