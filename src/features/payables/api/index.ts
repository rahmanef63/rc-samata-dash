// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const usePayables = (branchId: string) =>
  useQuery(api.features.payables.queries.listByBranch, { branchId: branchId as any });

export const usePayable = (id: string) =>
  useQuery(api.features.payables.queries.getById, { id: id as any });

export const usePayablesByVendor = (vendorId: string) =>
  useQuery(api.features.payables.queries.listByVendor, { vendorId: vendorId as any });

export const usePayablePayments = (payableId: string) =>
  useQuery(api.features.payables.queries.listPayments, { payableId: payableId as any });

export const useCreatePayable = () => useMutation(api.features.payables.mutations.create);
export const useUpdatePayable = () => useMutation(api.features.payables.mutations.update);
export const useDeletePayable = () => useMutation(api.features.payables.mutations.remove);

export const useAddPayablePayment = () => useMutation(api.features.payables.mutations.addPayment);
