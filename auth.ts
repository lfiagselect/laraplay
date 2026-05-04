// LARAPLAY — NextAuth full config (Node runtime)
// Utilisé par routes serveur. Whitelist check via Sheet.

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isAuthorized } from "@/lib/whitelist";

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
  callbacks: {
    async signIn({ user }) {
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
