import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { ResolvedEnv } from "../util/env.js";

const AUDIT_BP = resolve(homedir(), ".agents/skills/audit-bp/scripts/audit-bp.sh");
const AUDIT_FEATURES = resolve(
  homedir(),
  ".agents/skills/audit-bp/scripts/audit-features.sh"
);

interface AuditResult {
  exit: number;
  stdout: string;
  stderr: string;
  json?: unknown;
}

function run(script: string, args: string[], cwd: string): AuditResult {
  if (!existsSync(script)) {
    return {
      exit: 127,
      stdout: "",
      stderr: `audit script not found: ${script}`,
    };
  }
  const r = spawnSync("bash", [script, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
  });
  const stdout = r.stdout || "";
  const stderr = r.stderr || "";
  let json: unknown;
  const m = stdout.match(/audit-bp\.kpi\s+(\{[\s\S]*?\})\s*$/);
  if (m) {
    try {
      json = JSON.parse(m[1]);
    } catch {
      /* non-JSON */
    }
  } else {
    try {
      json = JSON.parse(stdout);
    } catch {
      /* not JSON */
    }
  }
  return { exit: r.status ?? -1, stdout, stderr, json };
}

export function auditRun(
  env: ResolvedEnv,
  scope: "changed" | "full" = "changed"
): AuditResult {
  return run(AUDIT_BP, [`--${scope}`, "--json"], env.repoRoot);
}

export function auditFeatures(env: ResolvedEnv): AuditResult {
  return run(AUDIT_FEATURES, ["--json"], env.repoRoot);
}
