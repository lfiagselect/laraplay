// LARAPLAY — NextAuth full config (Node runtime)
// Utilisé par routes serveur. Whitelist check via Sheet.
// + Credentials provider "device" pour TV via Device Flow OAuth.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { isAuthorized } from "@/lib/whitelist";
import { getByDeviceCode, consumeDevice, hashCode } from "@/lib/device-flow";

declare module "next-auth" {
  interface Session {
    user: {
      email: string;
      name?: string | null;
      image?: string | null;
      role: "admin" | "user";
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      id: "device",
      name: "TV Device Flow",
      credentials: {
        device_code: { label: "Device Code", type: "text" },
      },
      async authorize(credentials) {
        const deviceCode = credentials?.device_code;
        if (!deviceCode || typeof deviceCode !== "string") return null;
        // TTL vérifié dans getByDeviceCode; seuls approved non expirés passent.
        const session = await getByDeviceCode(deviceCode);
        if (!session) return null;
        if (session.status !== "approved") return null; // expired/consumed/denied refusés
        if (!session.email) return null;
        const wl = await isAuthorized(session.email);
        if (!wl) return null;
        // Usage unique: compare-and-set approved -> consumed.
        // Deux finalisations concurrentes: une seule crée une session.
        const consumed = await consumeDevice(deviceCode);
        if (!consumed) {
          console.warn("[auth/device] invalid_grant", hashCode(deviceCode));
          return null;
        }
        return {
          id: consumed.email!,
          email: consumed.email!,
          name: wl.name || consumed.email!,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Device flow: déjà validé dans authorize() via whitelist
      if (account?.provider === "device") return true;
      // Google OAuth standard
      if (!user.email) return false;
      const entry = await isAuthorized(user.email);
      if (!entry) return "/unauthorized";
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const entry = await isAuthorized(user.email);
        token.role = entry?.role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as "admin" | "user") ?? "user";
      }
      return session;
    },
  },
});
