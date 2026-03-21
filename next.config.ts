import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
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
