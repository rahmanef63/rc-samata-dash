"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserRole } from "@/features/auth/useUserRole";

/**
 * Owner-only allowlist — chart/report/interactive routes only.
 * Anything outside this list redirects to "/" (dashboard charts).
 *
 * Keep tight: owner should only see things to *look* at, not edit.
 */
const OWNER_ALLOWED_PREFIXES = [
  "/",
  "/chat",
  "/laporan",
  "/report",
  "/profile",
] as const;

function isOwnerAllowed(pathname: string): boolean {
  if (pathname === "/") return true;
  return OWNER_ALLOWED_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

/**
 * Restricts navigation by role. super_admin + staff: pass through.
 * owner: redirected to "/" if current path is outside the allowlist.
 *
 * Admin/staff render immediately even while the role query is loading —
 * worst case is a one-frame flash of disallowed content for an owner who
 * deep-links into a restricted route, mitigated by the redirect below.
 */
export function RoleGuard({ children }: { children: ReactNode }) {
  const role = useUserRole();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (role === "owner" && !isOwnerAllowed(pathname)) {
      router.replace("/");
    }
  }, [role, pathname, router]);

  if (role === "owner" && !isOwnerAllowed(pathname)) return null;
  return <>{children}</>;
}
