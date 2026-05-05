import { ConvexHttpClient } from "convex/browser";
import type { ResolvedEnv } from "./util/env.js";

let client: ConvexHttpClient | null = null;

/**
 * `setAdminAuth(adminKey, fakeUserIdentity?)` lets self-hosted admin calls
 * impersonate a real user so functions that gate on `ctx.auth.getUserIdentity()`
 * (e.g. `requireAuth` in `convex/shared/auth.ts`) succeed.
 *
 * Subject format follows Convex Auth: `<userId>|<sessionId>`. Issuer must
 * match the deployment's CONVEX_SITE_URL (set by the convex-auth library).
 */
export function getClient(env: ResolvedEnv): ConvexHttpClient {
  if (client) return client;
  client = new ConvexHttpClient(env.convexUrl);
  if (env.adminKey) {
    // Method must be invoked on `client` to preserve `this`-binding —
    // setAdminAuth calls `this.clearAuth()` internally.
    const c = client as unknown as {
      setAdminAuth: (k: string, identity?: Record<string, unknown>) => void;
    };
    if (env.actAsUserId) {
      const issuer = env.convexSiteUrl ?? env.convexUrl;
      c.setAdminAuth(env.adminKey, {
        subject: `${env.actAsUserId}|mcp_admin_session`,
        issuer,
        tokenIdentifier: `${issuer}|${env.actAsUserId}`,
      });
    } else {
      c.setAdminAuth(env.adminKey);
    }
  }
  return client;
}

export async function runQuery(
  env: ResolvedEnv,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const c = getClient(env);
  return c.query(fn as never, args as never);
}

export async function runMutation(
  env: ResolvedEnv,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const c = getClient(env);
  return c.mutation(fn as never, args as never);
}

export async function runAction(
  env: ResolvedEnv,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const c = getClient(env);
  return c.action(fn as never, args as never);
}
