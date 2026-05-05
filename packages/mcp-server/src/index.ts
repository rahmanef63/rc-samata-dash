#!/usr/bin/env node
/**
 * RC Samata Dash MCP server.
 *
 * Bridges Claude Code to the RC Samata Convex self-hosted backend
 * (api-rcsamata.rahmanef.com) with admin-key auth.
 *
 * Run:
 *   node dist/index.js
 *   # or with overrides:
 *   node dist/index.js --url=https://api-rcsamata.rahmanef.com --admin-key=...
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { resolveEnv } from "./util/env.js";
import { runQuery, runMutation, runAction } from "./convex.js";
import { TOOLS } from "./tools/manifest.js";
import {
  projectInfo,
  gitStatus,
  gitLog,
  listConvexFunctions,
} from "./tools/project.js";
import { auditRun, auditFeatures } from "./tools/audit.js";

const env = resolveEnv();

const server = new Server(
  { name: "rc-samata-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

function asText(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function asError(msg: string) {
  return {
    content: [{ type: "text" as const, text: msg }],
    isError: true,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  const spec = TOOLS.find((t) => t.name === name);
  if (!spec) return asError(`Unknown tool: ${name}`);

  try {
    // Local helpers
    switch (name) {
      case "project_info":
        return asText(projectInfo(env));
      case "git_status":
        return asText(gitStatus(env));
      case "git_log":
        return asText(gitLog(env, Number(args.limit) || 20));
      case "list_convex_functions":
        return asText(listConvexFunctions(env));
      case "audit_run":
        return asText(
          auditRun(env, (args.scope as "changed" | "full") ?? "changed")
        );
      case "audit_features":
        return asText(auditFeatures(env));
      case "convex_query":
        return asText(
          await runQuery(
            env,
            String(args.fn),
            (args.args as Record<string, unknown>) ?? {}
          )
        );
      case "convex_mutation": {
        if (!env.allowWrite || !args.confirm) {
          return asError(
            "Write-gated. Set RC_SAMATA_MCP_ALLOW_WRITE=1 AND pass confirm:true to call mutations."
          );
        }
        return asText(
          await runMutation(
            env,
            String(args.fn),
            (args.args as Record<string, unknown>) ?? {}
          )
        );
      }
      case "convex_action": {
        if (!env.allowWrite || !args.confirm) {
          return asError(
            "Write-gated. Set RC_SAMATA_MCP_ALLOW_WRITE=1 AND pass confirm:true to call actions."
          );
        }
        return asText(
          await runAction(
            env,
            String(args.fn),
            (args.args as Record<string, unknown>) ?? {}
          )
        );
      }
    }

    // Manifest-driven Convex tools
    if (spec.convex) {
      if (spec.write && (!env.allowWrite || !args.confirm)) {
        return asError(
          "Write-gated. Set RC_SAMATA_MCP_ALLOW_WRITE=1 AND pass confirm:true."
        );
      }
      const fn = spec.convex.fn;
      if (spec.convex.kind === "query") return asText(await runQuery(env, fn, args));
      if (spec.convex.kind === "mutation")
        return asText(await runMutation(env, fn, args));
      if (spec.convex.kind === "action")
        return asText(await runAction(env, fn, args));
    }

    return asError(`Tool ${name} has no handler`);
  } catch (err) {
    return asError(
      `Error in ${name}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `rc-samata-mcp listening on stdio (convex=${env.convexUrl}, write=${env.allowWrite})`
);
