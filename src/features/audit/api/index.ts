import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useAuditLogs = (branchId: string) =>
  useQuery(api.features.audit.queries.listByBranch, branchId ? { branchId: branchId as Id<"branches"> } : "skip");

export const useCreateAuditLog = () => useMutation(api.features.audit.mutations.create);
