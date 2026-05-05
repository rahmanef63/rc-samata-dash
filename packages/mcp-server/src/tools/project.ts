import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { ResolvedEnv } from "../util/env.js";
import { maskSecret } from "../util/env.js";

function sh(cmd: string, args: string[], cwd: string): string {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8" }).trim();
  } catch (err) {
    return `(error: ${err instanceof Error ? err.message : String(err)})`;
  }
}

export function projectInfo(env: ResolvedEnv) {
  const pkgPath = resolve(env.repoRoot, "package.json");
  const pkg = existsSync(pkgPath)
    ? JSON.parse(readFileSync(pkgPath, "utf8"))
    : {};
  return {
    name: pkg.name ?? "rc-samata-dash",
    version: pkg.version,
    next: pkg.dependencies?.next,
    react: pkg.dependencies?.react,
    convex: pkg.dependencies?.convex,
    convexUrl: env.convexUrl,
    convexSiteUrl: env.convexSiteUrl,
    adminKey: maskSecret(env.adminKey),
    actAsUserId: env.actAsUserId ?? null,
    allowWrite: env.allowWrite,
    repoRoot: env.repoRoot,
  };
}

export function gitStatus(env: ResolvedEnv) {
  const branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"], env.repoRoot);
  const porcelain = sh("git", ["status", "--porcelain"], env.repoRoot);
  const ahead = sh(
    "git",
    ["rev-list", "--count", "@{u}..HEAD"],
    env.repoRoot
  );
  const behind = sh(
    "git",
    ["rev-list", "--count", "HEAD..@{u}"],
    env.repoRoot
  );
  return {
    branch,
    ahead: Number(ahead) || 0,
    behind: Number(behind) || 0,
    dirty: porcelain.length > 0,
    changes: porcelain
      ? porcelain.split("\n").map((l) => l.trim())
      : [],
  };
}

export function gitLog(env: ResolvedEnv, limit = 20) {
  const out = sh(
    "git",
    [
      "log",
      `-n${limit}`,
      "--pretty=format:%h%x09%cs%x09%s",
    ],
    env.repoRoot
  );
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...msg] = line.split("\t");
      return { hash, date, subject: msg.join("\t") };
    });
}

export function listConvexFunctions(env: ResolvedEnv) {
  const out: Record<string, string[]> = {};
  const featuresDir = resolve(env.repoRoot, "convex/features");
  if (!existsSync(featuresDir)) return out;
  for (const feature of readdirSync(featuresDir)) {
    const dir = resolve(featuresDir, feature);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".ts") || file.startsWith("_")) continue;
      const text = readFileSync(resolve(dir, file), "utf8");
      const names = [
        ...text.matchAll(/^export const (\w+)\s*=\s*(query|mutation|action)\(/gm),
      ].map((m) => m[1]);
      if (names.length) {
        const ref = `features/${feature}/${file.replace(/\.ts$/, "")}`;
        out[ref] = names;
      }
    }
  }
  return out;
}
