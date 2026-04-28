import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/components/ModalProvider";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userEmail = session?.user?.email ?? null;

  return (
    <html lang="fr" className={`${inter.variable} ${bebas.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-white">
        <ModalProvider userEmail={userEmail}>{children}</ModalProvider>
      </body>
    </html>
  );
}
