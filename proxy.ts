// LARAPLAY — Proxy protection routes (Next.js 16+, ex-middleware)
// Renommé middleware.ts → proxy.ts (Next 16 convention).
// Utilise authConfig léger, pas auth.ts (qui charge googleapis).

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { TV_UA_REGEX } from "./lib/tv";

const PUBLIC_PATHS = ["/login", "/login-tv", "/login-basic", "/unauthorized", "/manifest.webmanifest", "/d"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/ping", "/api/revalidate", "/api/webhook"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.auth) {
    // TV: redirige vers /login-basic (Google OAuth bloque sans clavier/souris)
    const ua = req.headers.get("user-agent") ?? "";
    const isTV = TV_UA_REGEX.test(ua);
    const loginPath = isTV ? "/login-basic" : "/login";
    const loginUrl = new URL(loginPath, req.url);
    if (!isTV) {
      loginUrl.searchParams.set("callbackUrl", req.url);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
