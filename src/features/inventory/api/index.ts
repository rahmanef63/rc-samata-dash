import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useStockItems = () =>
  useQuery(api.features.inventory.queries.listItems, {});

export const useStockItem = (id: string) =>
  useQuery(api.features.inventory.queries.getItem, id ? { id: id as Id<"stockItems"> } : "skip");

export const useCreateStockItem = () => useMutation(api.features.inventory.mutations.createItem);
export const useUpdateStockItem = () => useMutation(api.features.inventory.mutations.updateItem);
export const useDeleteStockItem = () => useMutation(api.features.inventory.mutations.deleteItem);

export const useStockMovements = (itemId: string) =>
  useQuery(api.features.inventory.queries.listMovements,
    itemId ? { itemId: itemId as Id<"stockItems"> } : "skip"
  );

export const useAllStockMovements = () =>
  useQuery(api.features.inventory.queries.listAllMovements, {});

export const useRecordMovement = () => useMutation(api.features.inventory.mutations.recordMovement);
