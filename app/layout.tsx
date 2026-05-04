import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ModalProvider } from "@/components/ModalProvider";
import { BottomTabBar } from "@/components/BottomTabBar";
import { TVNavProvider } from "@/components/TVNavProvider";
import { auth } from "@/auth";
import { detectTVServer } from "@/lib/tv";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Bebas Neue self-host (public/fonts/bebas-neue-latin.woff2) via @font-face globals.css
// → évite blocage DNS fonts.googleapis.com sur certaines TV (Tizen ancien, env restrictifs)

export const metadata: Metadata = {
  title: "LARAPLAY",
  description: "Streaming privé — Lara Fabian",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LARAPLAY",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, hdrs] = await Promise.all([auth(), headers()]);
  const userEmail = session?.user?.email ?? null;
  const isAdmin = session?.user?.role === "admin";
  const isTV = detectTVServer(hdrs.get("user-agent"));

  return (
    <html
      lang="fr"
      className={[
        inter.variable,
        "h-full antialiased",
        isTV ? "tv" : "",
      ].filter(Boolean).join(" ")}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-main)] text-white">
        <ModalProvider userEmail={userEmail}>
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
          <BottomTabBar isAdmin={isAdmin} />
          <TVNavProvider />
        </ModalProvider>
      </body>
    </html>
  );
}
