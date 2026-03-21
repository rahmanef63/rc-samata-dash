// @ts-nocheck
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useAuditLogs = (branchId: string) =>
  useQuery(api.features.audit.queries.listByBranch, { branchId: branchId as any });

export const useCreateAuditLog = () => useMutation(api.features.audit.mutations.create);
