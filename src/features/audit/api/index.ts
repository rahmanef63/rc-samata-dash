import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useAuditLogs = () =>
  useQuery(api.features.audit.queries.listByBranch, {});

export const useCreateAuditLog = () => useMutation(api.features.audit.mutations.create);
