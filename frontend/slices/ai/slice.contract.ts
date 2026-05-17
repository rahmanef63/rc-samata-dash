/**
 * Slice contract for `ai` — v0.1.0.
 *
 * Auto-generated. Standalone contract (no helper import) so the slice
 * stays portable across repos. Refine `provides.components` once the
 * public API is stable.
 */
export const contract = {
  id: "ai",
  version: "0.1.0",
  requires: {
    auth: "convex" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: [] as const,
  },
  provides: {
    components: [] as string[],
  },
  conflicts: [] as string[],
  bidir: {
    syncPolicy: "manual" as const,
    generalization: {
      level: "portable" as const,
      forbiddenTerms: ["rahmanef", "rahmanef.com"] as string[],
      requiredProps: [] as string[],
    },
  },
} as const;
