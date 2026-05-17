"use client";

import { useEffect } from "react";
import { isChunkLoadError } from "./ChunkErrorBoundary";
import { hardReload } from "./VersionWatcher";

const RELOAD_FLAG = "rcsamata:chunk-reloaded-at";
const RELOAD_COOLDOWN_MS = 60_000;

/** Catches chunk-load failures that escape the React tree — async
 *  `import()` rejections in event handlers, next/dynamic without a
 *  wrapping ErrorBoundary. Pairs with ChunkErrorBoundary. */
export function GlobalErrorListeners() {
  useEffect(() => {
    function maybeReload(err: unknown) {
      if (!isChunkLoadError(err)) return;
      try {
        const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? "0");
        if (Date.now() - last <= RELOAD_COOLDOWN_MS) return;
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      } catch {
        /* storage disabled */
      }
      void hardReload();
    }

    const onError = (e: ErrorEvent) => maybeReload(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => maybeReload(e.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
