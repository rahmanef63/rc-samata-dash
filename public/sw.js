/// <reference lib="webworker" />

/* RC Samata service worker — minimal install-ability + offline fallback.
 *
 * IMPORTANT: this SW deliberately does NOT cache /_next/static/ assets
 * (chunks, CSS) because after a redeploy the cached chunk filenames no
 * longer exist on the server, producing "Failed to load chunk" errors.
 * VersionWatcher prompts a reload on each redeploy; ChunkErrorBoundary
 * + GlobalErrorListeners auto-reload as a safety net.
 *
 * Cached: PWA icons + manifest only. Everything else is network-first
 * (no offline page fallback to keep things simple). */

const CACHE_NAME = "rc-samata-assets-v2";
const PRECACHE_ASSETS = [
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/favicon.ico",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and Convex backend traffic
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (
    url.pathname.includes("/api/") ||
    url.protocol === "wss:" ||
    url.hostname.includes("convex")
  ) {
    return;
  }

  // Cache-first for ONLY the icons / manifest that are stable across builds
  if (PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Network-only for everything else (HTML + JS chunks + CSS).
  // No cache => no stale chunks after deploy.
});
