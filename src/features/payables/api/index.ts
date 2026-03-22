import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const usePayables = (branchId: string) =>
  useQuery(api.features.payables.queries.listByBranch, { branchId: branchId as Id<"branches"> });

export const usePayable = (id: string) =>
  useQuery(api.features.payables.queries.getById, { id: id as Id<"payables"> });

export const usePayablesByVendor = (vendorId: string) =>
  useQuery(api.features.payables.queries.listByVendor, { vendorId: vendorId as Id<"vendors"> });

export const usePayablePayments = (payableId: string) =>
  useQuery(api.features.payables.queries.listPayments, { payableId: payableId as Id<"payables"> });

export const useCreatePayable = () => useMutation(api.features.payables.mutations.create);
export const useUpdatePayable = () => useMutation(api.features.payables.mutations.update);
export const useDeletePayable = () => useMutation(api.features.payables.mutations.remove);

export const useAddPayablePayment = () => useMutation(api.features.payables.mutations.addPayment);
