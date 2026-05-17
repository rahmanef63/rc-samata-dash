"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

type BranchScopeValue = {
  /** null = ALL branches (aggregate); otherwise specific branch */
  branchId: Id<"branches"> | null;
  setBranchId: (id: Id<"branches"> | null) => void;
  /** Raw Convex docs — full fields, stable reference while data is unchanged. */
  branches: Doc<"branches">[] | undefined;
  isLoading: boolean;
};

const BranchScopeContext = createContext<BranchScopeValue | null>(null);

/**
 * Single source of truth for the active branch scope.
 * URL key: `?b=ID` (omitted = first branch) ; `?b=all` = aggregate.
 *
 * Consumers can fall back to `branches?.[0]?._id` for backward-compat
 * (legacy single-branch hooks). New code prefers explicit `branchId`.
 */
export function BranchScopeProvider({ children }: { children: ReactNode }) {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlBranch = searchParams.get("b");
  const [branchId, setBranchIdState] = useState<Id<"branches"> | null>(null);

  // Keep latest refs to avoid stale closures inside the memoised setBranchId.
  const searchParamsRef = useRef(searchParams);
  const branchesRef = useRef(branches);
  const pathnameRef = useRef(pathname);
  searchParamsRef.current = searchParams;
  branchesRef.current = branches;
  pathnameRef.current = pathname;

  // Resolve URL → state once branches load. Only sets state when the
  // resolved id differs from the current one (prevents loop when
  // Convex returns a refreshed array ref with identical data).
  useEffect(() => {
    if (!branches || branches.length === 0) return;
    let next: Id<"branches"> | null;
    if (urlBranch === "all") {
      next = null;
    } else {
      const fromUrl = branches.find((b) => String(b._id) === urlBranch);
      next = fromUrl ? fromUrl._id : branches[0]._id;
    }
    setBranchIdState((prev) => (prev === next ? prev : next));
  }, [branches, urlBranch]);

  const setBranchId = useCallback((id: Id<"branches"> | null) => {
    setBranchIdState(id);
    const sp = searchParamsRef.current;
    const params = new URLSearchParams(sp.toString());
    const firstId = branchesRef.current?.[0]?._id;
    if (id === null) {
      params.set("b", "all");
    } else if (firstId && firstId === id) {
      params.delete("b");
    } else {
      params.set("b", String(id));
    }
    const qs = params.toString();
    router.replace(
      qs ? `${pathnameRef.current}?${qs}` : pathnameRef.current,
      { scroll: false },
    );
  }, [router]);

  const value = useMemo<BranchScopeValue>(
    () => ({
      branchId,
      setBranchId,
      branches,
      isLoading: branches === undefined,
    }),
    [branchId, setBranchId, branches],
  );

  return (
    <BranchScopeContext.Provider value={value}>
      {children}
    </BranchScopeContext.Provider>
  );
}

export function useBranchScope(): BranchScopeValue {
  const ctx = useContext(BranchScopeContext);
  if (!ctx) {
    throw new Error("useBranchScope must be used inside <BranchScopeProvider>");
  }
  return ctx;
}
