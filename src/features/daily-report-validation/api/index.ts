import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useDailyCheckData(businessDate: string | undefined) {
  return useQuery(
    api.features.dailyReportValidation.queries.getDailyCheckData,
    businessDate ? { businessDate } : "skip",
  );
}

export function useDailyReportValidations() {
  return useQuery(
    api.features.dailyReportValidation.queries.listDailyReportValidations,
    { limit: 50 },
  );
}

export function useSaveValidation() {
  return useMutation(api.features.dailyReportValidation.mutations.saveDailyReportValidation);
}

export function useRemoveValidation() {
  return useMutation(api.features.dailyReportValidation.mutations.removeDailyReportValidation);
}
