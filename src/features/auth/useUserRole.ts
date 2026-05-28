"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type Role = "super_admin" | "owner" | "staff";

/**
 * Returns:
 *   - undefined while loading
 *   - null when not signed in
 *   - "super_admin" | "owner" | "staff" otherwise (defaults to "staff")
 */
export function useUserRole(): Role | null | undefined {
  return useQuery(api.features.auth.queries.myRole) as
    | Role
    | null
    | undefined;
}

/**
 * Finance "manage" capability — mirrors the backend requireRole(["owner",
 * "super_admin"]) gate on destructive finance mutations (deletes, owner
 * transfers, period lock/close). Staff are entry/read-only. Returns false
 * while the role is loading or the user is unauthenticated, so destructive
 * controls stay hidden until an elevated role is confirmed.
 */
export function useCanManageFinance(): boolean {
  const role = useUserRole();
  return role === "owner" || role === "super_admin";
}
