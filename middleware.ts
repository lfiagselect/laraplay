// LARAPLAY — Middleware protection routes (edge-safe)
// Utilise authConfig léger, pas auth.ts (qui charge googleapis).

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const PUBLIC_PATHS = ["/login", "/login-tv", "/unauthorized", "/manifest.webmanifest"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/ping", "/api/revalidate"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
