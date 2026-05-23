import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useExpenses = () =>
  useQuery(api.features.expenses.queries.listByBranch, {});

export const useExpense = (id: string) =>
  useQuery(api.features.expenses.queries.getById, id ? { id: id as Id<"expenses"> } : "skip");

export const useExpenseLineItems = (expenseId: string) =>
  useQuery(api.features.expenses.queries.listLineItems, expenseId ? { expenseId: expenseId as Id<"expenses"> } : "skip");

export const useExpensesByStatus = (status: "draft" | "submitted" | "approved" | "paid" | "rejected") =>
  useQuery(api.features.expenses.queries.listByStatus, status ? { status } : "skip");

export const useCreateExpense = () => useMutation(api.features.expenses.mutations.create);
export const useUpdateExpense = () => useMutation(api.features.expenses.mutations.update);
export const useDeleteExpense = () => useMutation(api.features.expenses.mutations.remove);

export const useAddExpenseLineItem = () => useMutation(api.features.expenses.mutations.addLineItem);
export const useRemoveExpenseLineItem = () => useMutation(api.features.expenses.mutations.removeLineItem);
