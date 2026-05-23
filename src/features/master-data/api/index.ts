/**
 * Frontend API hooks for Master Data feature.
 * Connects to convex/features/masterData/* functions.
 *
 * Single-tenant — branches removed 2026-05-23.
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── Vendors ────────────────────────────────────────────────
export const useVendors = (activeOnly?: boolean) =>
  useQuery(
    api.features.masterData.queries.listVendors,
    activeOnly === undefined ? {} : { activeOnly },
  );
export const useVendor = (id: string) => useQuery(api.features.masterData.queries.getVendor, id ? { id: id as Id<"vendors"> } : "skip");
export const useCreateVendor = () => useMutation(api.features.masterData.mutations.createVendor);
export const useUpdateVendor = () => useMutation(api.features.masterData.mutations.updateVendor);
export const useDeleteVendor = () => useMutation(api.features.masterData.mutations.deleteVendor);

// ─── Income Channels ────────────────────────────────────────
export const useIncomeChannels = () => useQuery(api.features.masterData.queries.listIncomeChannels);
export const useCreateIncomeChannel = () => useMutation(api.features.masterData.mutations.createIncomeChannel);
export const useUpdateIncomeChannel = () => useMutation(api.features.masterData.mutations.updateIncomeChannel);
export const useDeleteIncomeChannel = () => useMutation(api.features.masterData.mutations.deleteIncomeChannel);

// ─── Expense Categories ─────────────────────────────────────
export const useExpenseCategories = () => useQuery(api.features.masterData.queries.listExpenseCategories);
export const useCreateExpenseCategory = () => useMutation(api.features.masterData.mutations.createExpenseCategory);
export const useUpdateExpenseCategory = () => useMutation(api.features.masterData.mutations.updateExpenseCategory);
export const useDeleteExpenseCategory = () => useMutation(api.features.masterData.mutations.deleteExpenseCategory);
