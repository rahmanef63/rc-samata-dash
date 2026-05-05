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
