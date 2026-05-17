#!/usr/bin/env node
/**
 * Phase 4 (hybrid) — create frontend/slices/<slug>/ shells that:
 *   - re-export from the existing src/features/<slug> code
 *   - carry the rr-spec trio (slice.json + slice.contract.ts + slice.manifest.json)
 *
 * Existing code at src/features/* stays put. A second tsconfig path
 * `@/slices/*` resolves to ./frontend/slices/* so consumers can pick
 * either entry. Full code migration deferred until owner-view is
 * lifted out as a superspace slice.
 *
 * Idempotent — files that already exist are not overwritten.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const FEATURES = path.join(REPO, "src", "features");
const SLICES = path.join(REPO, "frontend", "slices");

await fs.mkdir(SLICES, { recursive: true });

const slugs = (await fs.readdir(FEATURES, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
  .map((e) => e.name);

let writtenIndex = 0;
let writtenJson = 0;
let writtenContract = 0;
let writtenManifest = 0;

for (const slug of slugs) {
  const sliceDir = path.join(SLICES, slug);
  await fs.mkdir(sliceDir, { recursive: true });
  const title = slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  // index.ts — re-export the existing feature
  const indexPath = path.join(sliceDir, "index.ts");
  if (!(await exists(indexPath))) {
    const featureIndex = path.join(FEATURES, slug, "index.ts");
    const featureIndexTsx = path.join(FEATURES, slug, "index.tsx");
    const hasIndex =
      (await exists(featureIndex)) || (await exists(featureIndexTsx));
    const body = hasIndex
      ? `// Re-export the active implementation; code still lives at\n// src/features/${slug} until a full src→slices migration ships.\nexport * from "@/features/${slug}";\n`
      : `// No index.ts in src/features/${slug} yet — fill this in or run\n// scripts/generate-slice-shells.mjs again after adding one.\nexport {};\n`;
    await fs.writeFile(indexPath, body);
    writtenIndex += 1;
  }

  // slice.json
  const sliceJsonPath = path.join(sliceDir, "slice.json");
  if (!(await exists(sliceJsonPath))) {
    const json = {
      $schema: "https://resource.rahmanef.com/slice-schema.json",
      slug,
      version: "0.1.0",
      category: "uncategorized",
      title,
      description: `${title} slice (rc-samata).`,
      namespace: `@/slices/${slug}`,
      kind: "full",
      convex: {
        schemaPath: `convex/features/${slug}/_schema.ts`,
        rootPaths: [`convex/features/${slug}`],
      },
      frontend: { slicePath: `frontend/slices/${slug}` },
      deps: { shared: [], slices: [], convex: [], shadcn: [], npm: [] },
    };
    await fs.writeFile(sliceJsonPath, JSON.stringify(json, null, 2) + "\n");
    writtenJson += 1;
  }

  // slice.contract.ts
  const contractPath = path.join(sliceDir, "slice.contract.ts");
  if (!(await exists(contractPath))) {
    const body = `/**
 * Slice contract for \`${slug}\` — v0.1.0.
 *
 * Auto-generated. Standalone contract (no helper import) so the slice
 * stays portable across repos. Refine \`provides.components\` once the
 * public API is stable.
 */
export const contract = {
  id: "${slug}",
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
`;
    await fs.writeFile(contractPath, body);
    writtenContract += 1;
  }

  // slice.manifest.json
  const manifestPath = path.join(sliceDir, "slice.manifest.json");
  if (!(await exists(manifestPath))) {
    const manifest = {
      $schema: "https://resource.rahmanef.com/slice-manifest-schema.json",
      slug,
      version: "0.1.0",
      tier: 3,
      distribution: {
        method: "cli-copy",
        command: `npx rr add ${slug}`,
        consumerPath: `slices/${slug}`,
      },
      files: ["index.ts"],
      convex: {
        schemaPath: `convex/features/${slug}/_schema.ts`,
        rootPaths: [`convex/features/${slug}`],
      },
      imports: { shared: [], external: [] },
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    writtenManifest += 1;
  }
}

console.log(
  `✓ ${slugs.length} slice shells: ${writtenIndex} index.ts + ${writtenJson} slice.json + ${writtenContract} slice.contract.ts + ${writtenManifest} slice.manifest.json`,
);

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
