// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useExpenses = (branchId: string) =>
  useQuery(api.features.expenses.queries.listByBranch, { branchId: branchId as any });

export const useExpense = (id: string) =>
  useQuery(api.features.expenses.queries.getById, { id: id as any });

export const useExpenseLineItems = (expenseId: string) =>
  useQuery(api.features.expenses.queries.listLineItems, { expenseId: expenseId as any });

export const useExpensesByStatus = (status: "draft" | "submitted" | "approved" | "paid" | "rejected") =>
  useQuery(api.features.expenses.queries.listByStatus, { status });

export const useCreateExpense = () => useMutation(api.features.expenses.mutations.create);
export const useUpdateExpense = () => useMutation(api.features.expenses.mutations.update);
export const useDeleteExpense = () => useMutation(api.features.expenses.mutations.remove);

export const useAddExpenseLineItem = () => useMutation(api.features.expenses.mutations.addLineItem);
export const useRemoveExpenseLineItem = () => useMutation(api.features.expenses.mutations.removeLineItem);
