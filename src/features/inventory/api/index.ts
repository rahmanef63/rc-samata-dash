import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useStockItems = (branchId: string) =>
  useQuery(api.features.inventory.queries.listItems, branchId ? { branchId: branchId as Id<"branches"> } : "skip");

export const useStockItem = (id: string) =>
  useQuery(api.features.inventory.queries.getItem, id ? { id: id as Id<"stockItems"> } : "skip");

export const useCreateStockItem = () => useMutation(api.features.inventory.mutations.createItem);
export const useUpdateStockItem = () => useMutation(api.features.inventory.mutations.updateItem);
export const useDeleteStockItem = () => useMutation(api.features.inventory.mutations.deleteItem);

export const useStockMovements = (branchId: string, itemId: string) =>
  useQuery(api.features.inventory.queries.listMovements,
    (branchId && itemId) ? {
      branchId: branchId as Id<"branches">,
      itemId: itemId as Id<"stockItems">,
    } : "skip"
  );

export const useAllStockMovements = (branchId: string) =>
  useQuery(api.features.inventory.queries.listAllMovements, branchId ? { branchId: branchId as Id<"branches"> } : "skip");

export const useRecordMovement = () => useMutation(api.features.inventory.mutations.recordMovement);
