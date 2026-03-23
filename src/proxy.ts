import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Proxy (formerly middleware — renamed for Next.js 16)
 * - Adds security headers to all responses
 * - Protects API-like routes
 *
 * Auth check lives client-side in AuthGuard (Convex tokens are in browser memory).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ─── Security Headers ─────────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // ─── Cache static assets aggressively ─────────────────────
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/pwa-") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // ─── Prevent direct access to API internals ───────────────
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/image (image optimization)
     * - static files (svg, png, jpg, ico, etc.)
     */
    "/((?!_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
