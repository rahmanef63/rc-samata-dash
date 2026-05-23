import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useDailySales = (businessDate?: string) =>
  useQuery(api.features.sales.queries.listByBranch, { businessDate });

export const useDailySale = (id: string) =>
  useQuery(api.features.sales.queries.getById, id ? { id: id as Id<"dailySales"> } : "skip");

export const useSalesByStatus = (status: "recorded" | "settled" | "pending_settlement") =>
  useQuery(api.features.sales.queries.listByStatus, status ? { status } : "skip");

export const useCreateSale = () => useMutation(api.features.sales.mutations.create);
export const useUpdateSale = () => useMutation(api.features.sales.mutations.update);
export const useDeleteSale = () => useMutation(api.features.sales.mutations.remove);
