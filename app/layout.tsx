import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/components/ModalProvider";
import { BottomTabBar } from "@/components/BottomTabBar";
import { auth } from "@/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

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
  const session = await auth();
  const userEmail = session?.user?.email ?? null;
  const isAdmin = session?.user?.role === "admin";

  return (
    <html lang="fr" className={`${inter.variable} ${bebas.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg-main)] text-white">
        <ModalProvider userEmail={userEmail}>
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
          <BottomTabBar isAdmin={isAdmin} />
        </ModalProvider>
      </body>
    </html>
  );
}
