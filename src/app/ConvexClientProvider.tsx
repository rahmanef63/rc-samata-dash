"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { type ReactNode, useState } from "react";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ChunkErrorBoundary } from "@/shared/components/ChunkErrorBoundary";
import { GlobalErrorListeners } from "@/shared/components/GlobalErrorListeners";
import { ServiceWorkerRefresher } from "@/shared/components/ServiceWorkerRefresher";
import { VersionWatcher } from "@/shared/components/VersionWatcher";

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

  return (
    <ChunkErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <GlobalErrorListeners />
        <ServiceWorkerRefresher />
        <VersionWatcher />
        {/* Toaster at root so the version-update toast shows on auth/landing
         *  routes too (outside the dashboard layout). */}
        <SonnerToaster richColors closeButton />
        {children}
      </ConvexAuthProvider>
    </ChunkErrorBoundary>
  );
}
