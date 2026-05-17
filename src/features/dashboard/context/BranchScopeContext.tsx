"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Id } from "../../../../convex/_generated/dataModel";

type BranchSummary = {
  _id: Id<"branches">;
  name: string;
};

type BranchScopeValue = {
  /** null = ALL branches (aggregate); otherwise specific branch */
  branchId: Id<"branches"> | null;
  setBranchId: (id: Id<"branches"> | null) => void;
  branches: BranchSummary[] | undefined;
  isLoading: boolean;
};

const BranchScopeContext = createContext<BranchScopeValue | null>(null);

/**
 * Single source of truth for the active branch scope.
 * URL key: `?b=ID` (omitted = first branch) ; `?b=all` = aggregate.
 * Old single-branch hooks keep working — they just call `useQuery(..., branches?.[0]?._id)`.
 * Opt-in: new code calls `useBranchScope()`.
 */
export function BranchScopeProvider({ children }: { children: ReactNode }) {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlBranch = searchParams.get("b");
  const [branchId, setBranchIdState] = useState<Id<"branches"> | null>(null);

  // Resolve URL → state once branches load
  useEffect(() => {
    if (!branches || branches.length === 0) return;
    if (urlBranch === "all") {
      setBranchIdState(null);
      return;
    }
    const fromUrl = branches.find((b) => String(b._id) === urlBranch);
    setBranchIdState(fromUrl ? fromUrl._id : branches[0]._id);
  }, [branches, urlBranch]);

  const setBranchId = (id: Id<"branches"> | null) => {
    setBranchIdState(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === null) {
      params.set("b", "all");
    } else if (branches && branches[0]?._id === id) {
      params.delete("b");
    } else {
      params.set("b", String(id));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const value = useMemo<BranchScopeValue>(
    () => ({
      branchId,
      setBranchId,
      branches: branches?.map((b) => ({ _id: b._id, name: b.name })),
      isLoading: branches === undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branchId, branches],
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
