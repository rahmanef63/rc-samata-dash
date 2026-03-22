/**
 * Frontend API hooks for Master Data feature.
 * Connects to convex/features/masterData/* functions.
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── Branches ───────────────────────────────────────────────
export const useBranches = () => useQuery(api.features.masterData.queries.listBranches);
export const useBranch = (id: string) => useQuery(api.features.masterData.queries.getBranch, { id: id as Id<"branches"> });
export const useCreateBranch = () => useMutation(api.features.masterData.mutations.createBranch);
export const useUpdateBranch = () => useMutation(api.features.masterData.mutations.updateBranch);
export const useDeleteBranch = () => useMutation(api.features.masterData.mutations.deleteBranch);

// ─── Vendors ────────────────────────────────────────────────
export const useVendors = (activeOnly?: boolean) =>
  useQuery(api.features.masterData.queries.listVendors, { activeOnly });
export const useVendor = (id: string) => useQuery(api.features.masterData.queries.getVendor, { id: id as Id<"vendors"> });
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
