"use client";

import { useEffect } from "react";

/** Re-registers the SW on every boot to ensure the latest /sw.js is in
 *  control. When the SW file changes (e.g. our cache strategy was
 *  updated), this triggers an install → activate cycle and the new SW
 *  immediately claims clients. Pairs with VersionWatcher: if the page
 *  is older than the latest deploy, the toast still asks for reload. */
export function ServiceWorkerRefresher() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;
        // Force update check — pulls /sw.js with our no-cache header and
        // installs a new worker if the body changed.
        await reg.update().catch(() => {});
      } catch {
        // Restricted contexts (file://, embedded iframes) — silently ignore.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
