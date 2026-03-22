"use client";

import { ConvexReactClient, ConvexHttpClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { type ReactNode, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const http = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const origAction = client.action.bind(client);
    // Route auth actions via HTTP to prevent "Connection lost while action was in flight".
    // The Dokploy proxy can close idle WebSockets mid-flight; HTTP is unaffected.
    (client as any).action = (ref: any, args?: any) => {
      const name = (ref as any)?._name ?? String(ref);
      if (typeof name === "string" && name.startsWith("auth:")) {
        return http.action(ref as any, args);
      }
      return origAction(ref, args);
    };
    return client;
  });

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
