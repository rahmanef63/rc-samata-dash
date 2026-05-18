import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../..");

function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function parseFlag(name: string): string | undefined {
  const flag = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(flag));
  return arg?.slice(flag.length);
}

export interface ResolvedEnv {
  convexUrl: string;
  convexSiteUrl?: string;
  adminKey?: string;
  /** When set, the MCP impersonates this user for queries/mutations that gate on auth. */
  actAsUserId?: string;
  allowWrite: boolean;
  repoRoot: string;
}

export function resolveEnv(): ResolvedEnv {
  const candidates = [
    resolve(REPO_ROOT, ".env.local"),
    resolve(REPO_ROOT, ".env"),
  ];
  const fileEnv: Record<string, string> = {};
  for (const p of candidates) {
    if (existsSync(p)) {
      Object.assign(fileEnv, parseDotenv(readFileSync(p, "utf8")));
    }
  }

  // Precedence: CLI flag → .env.local → shell env. Repo .env.local wins over
  // any shell-leaked NEXT_PUBLIC_CONVEX_URL so the MCP always targets THIS repo.
  const convexUrl =
    parseFlag("url") ??
    fileEnv.NEXT_PUBLIC_CONVEX_URL ??
    process.env.NEXT_PUBLIC_CONVEX_URL;

  const adminKey =
    parseFlag("admin-key") ??
    fileEnv.CONVEX_ADMIN_KEY ??
    process.env.CONVEX_ADMIN_KEY;

  if (!convexUrl) {
    throw new Error(
      "Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL in .env.local or pass --url=<convex-url>."
    );
  }

  const allowWrite =
    parseFlag("allow-write") === "1" ||
    process.env.RC_SAMATA_MCP_ALLOW_WRITE === "1";

  const convexSiteUrl =
    parseFlag("site-url") ??
    fileEnv.NEXT_PUBLIC_CONVEX_SITE_URL ??
    fileEnv.CONVEX_SITE_ORIGIN ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_ORIGIN;

  const actAsUserId =
    parseFlag("act-as") ??
    process.env.RC_SAMATA_MCP_ACT_AS ??
    fileEnv.RC_SAMATA_MCP_ACT_AS;

  return {
    convexUrl,
    convexSiteUrl,
    adminKey,
    actAsUserId,
    allowWrite,
    repoRoot: REPO_ROOT,
  };
}

export function maskSecret(s: string | undefined): string {
  if (!s) return "(unset)";
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
