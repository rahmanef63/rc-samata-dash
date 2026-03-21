// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useStockItems = (branchId: string) =>
  useQuery(api.features.inventory.queries.listItems, { branchId: branchId as any });

export const useStockItem = (id: string) =>
  useQuery(api.features.inventory.queries.getItem, { id: id as any });

export const useCreateStockItem = () => useMutation(api.features.inventory.mutations.createItem);
export const useUpdateStockItem = () => useMutation(api.features.inventory.mutations.updateItem);
export const useDeleteStockItem = () => useMutation(api.features.inventory.mutations.deleteItem);

export const useStockMovements = (branchId: string, itemId: string) =>
  useQuery(api.features.inventory.queries.listMovements, {
    branchId: branchId as any,
    itemId: itemId as any,
  });

export const useRecordMovement = () => useMutation(api.features.inventory.mutations.recordMovement);
