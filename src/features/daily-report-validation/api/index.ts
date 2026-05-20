import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useDailyCheckData(
  branchId: Id<"branches"> | undefined,
  businessDate: string | undefined,
) {
  return useQuery(
    api.features.dailyReportValidation.queries.getDailyCheckData,
    branchId && businessDate ? { branchId, businessDate } : "skip",
  );
}

export function useDailyReportValidations(
  branchId: Id<"branches"> | undefined,
) {
  return useQuery(
    api.features.dailyReportValidation.queries.listDailyReportValidations,
    branchId ? { branchId, limit: 50 } : "skip",
  );
}

export function useSaveValidation() {
  return useMutation(api.features.dailyReportValidation.mutations.saveDailyReportValidation);
}

export function useRemoveValidation() {
  return useMutation(api.features.dailyReportValidation.mutations.removeDailyReportValidation);
}
