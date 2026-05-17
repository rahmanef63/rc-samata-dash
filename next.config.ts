import type { NextConfig } from "next";

// Stable per-deploy build id. CI sets DOKPLOY_COMMIT_SHA / GITHUB_SHA;
// fallback timestamp keeps dev unique. Exposed as NEXT_PUBLIC_BUILD_ID
// so VersionWatcher can poll /api/version and prompt reload.
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.DOKPLOY_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  `dev-${Date.now()}`;
process.env.NEXT_PUBLIC_BUILD_ID = BUILD_ID;

const nextConfig: NextConfig = {
  output: "standalone",
  generateBuildId: () => BUILD_ID,
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy Vite SPA routes → new nested Next.js routes
      { source: "/sales", destination: "/finance", permanent: true },
      { source: "/cashflow", destination: "/finance", permanent: true },
      { source: "/expenses", destination: "/finance/expenses", permanent: true },
      { source: "/payables", destination: "/finance/payables", permanent: true },
      { source: "/petty-cash", destination: "/finance/petty-cash", permanent: true },
      { source: "/closing", destination: "/finance/closing", permanent: true },
      { source: "/inventory", destination: "/operation", permanent: true },
      { source: "/audit", destination: "/operation/audit", permanent: true },
      { source: "/master-data", destination: "/operation/master-data", permanent: true },
      { source: "/settings", destination: "/operation/settings", permanent: true },
    ];
  },
};

export default nextConfig;
