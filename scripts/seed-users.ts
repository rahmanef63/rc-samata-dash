#!/usr/bin/env tsx
/**
 * Seed canonical accounts (super_admin + owner).
 *
 * Reads NEXT_PUBLIC_CONVEX_URL + CONVEX_ADMIN_KEY from .env.local, then
 * invokes the internal action `_internal/seedUsers:seedAdminAndOwner`.
 *
 * Idempotent: if the email already exists, the password is rotated and the
 * role is upserted. Safe to re-run.
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const env = {
  ...loadDotEnv(resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_CONVEX_URL;
const adminKey = env.CONVEX_ADMIN_KEY;

if (!url || !adminKey) {
  console.error(
    "Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_ADMIN_KEY (looked in .env.local then process.env)",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(url);
(client as unknown as { setAdminAuth: (k: string) => void }).setAdminAuth(
  adminKey,
);

(async () => {
  // Internal-only function — admin-key auth required (set above).
  const result = await client.action(
    "_internal/seedUsers:seedAdminAndOwner" as never,
    {} as never,
  );
  console.log(JSON.stringify(result, null, 2));
})().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
