import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { BRAND } from "@/config/branding";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.shortName} - Owner Control`,
    template: `%s | ${BRAND.shortName}`,
  },
  description:
    `Owner Audit & Cash Control App for ${BRAND.franchise} Branch. Kontrol omzet, kas, hutang, dan operasional cabang.`,
  authors: [{ name: BRAND.name }],
  manifest: "/manifest.json",
  openGraph: {
    title: `${BRAND.shortName} - Owner Control`,
    description: "Kontrol penuh cabang Anda — omzet, kas, hutang, dan operasional.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.shortName,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/pwa-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  themeColor: "#dc2648",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/pwa-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen min-h-[100dvh] antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        {/* SW registration moved into ServiceWorkerRefresher inside
         *  ConvexClientProvider so it runs once with React lifecycle and
         *  calls reg.update() to pull a fresh /sw.js when the body changes. */}
      </body>
    </html>
  );
}
