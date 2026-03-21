import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "Rocket Chicken - Owner Control",
  description:
    "Owner Audit & Cash Control App for Rocket Chicken Branch. Kontrol omzet, kas, hutang, dan operasional cabang.",
  authors: [{ name: "Rocket Chicken" }],
  openGraph: {
    title: "Rocket Chicken - Owner Control",
    description: "Kontrol penuh cabang Anda — omzet, kas, hutang, dan operasional.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@RocketChicken",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RC Owner",
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
      <body className="min-h-screen min-h-[100dvh] antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
