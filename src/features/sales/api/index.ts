import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useDailySales = (branchId: string, businessDate?: string) =>
  useQuery(api.features.sales.queries.listByBranch, {
    branchId: branchId as Id<"branches">,
    businessDate,
  });

export const useDailySale = (id: string) =>
  useQuery(api.features.sales.queries.getById, { id: id as Id<"dailySales"> });

export const useSalesByStatus = (status: "recorded" | "settled" | "pending_settlement") =>
  useQuery(api.features.sales.queries.listByStatus, { status });

export const useCreateSale = () => useMutation(api.features.sales.mutations.create);
export const useUpdateSale = () => useMutation(api.features.sales.mutations.update);
export const useDeleteSale = () => useMutation(api.features.sales.mutations.remove);
