import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: {
    default: "RC Samata - Owner Control",
    template: "%s | RC Samata",
  },
  description:
    "Owner Audit & Cash Control App for Rocket Chicken Branch. Kontrol omzet, kas, hutang, dan operasional cabang.",
  authors: [{ name: "RC Samata Gowa" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "RC Samata - Owner Control",
    description: "Kontrol penuh cabang Anda — omzet, kas, hutang, dan operasional.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RC Samata",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
