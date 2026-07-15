// LARAPLAY — Proxy protection routes (Next.js 16+, ex-middleware)
// Renommé middleware.ts → proxy.ts (Next 16 convention).
// Utilise authConfig léger, pas auth.ts (qui charge googleapis).

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { TV_UA_REGEX } from "./lib/tv";
import { canonicalAppOrigin } from "./lib/app-origin";

const PUBLIC_PATHS = ["/login", "/login-tv", "/login-basic", "/unauthorized", "/manifest.webmanifest", "/d"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/ping", "/api/revalidate", "/api/webhook"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const redirectOrigin = process.env.NODE_ENV === "production"
    ? canonicalAppOrigin()
    : req.nextUrl.origin;

  // Unifie le mode TV client/serveur. Le paramètre est retiré de l'URL après
  // avoir posé le cookie afin que layout, proxy et lecteur prennent la même décision.
  const tvParam = req.nextUrl.searchParams.get("tv");
  if (tvParam === "1" || tvParam === "0") {
    const cleanUrl = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, `${redirectOrigin}/`);
    cleanUrl.searchParams.delete("tv");
    const res = NextResponse.redirect(cleanUrl, 303);
    if (tvParam === "1") {
      res.cookies.set("laraplay_legacy_tv", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      res.cookies.set("laraplay_legacy_tv", "", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
    }
    return res;
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (!req.auth) {
    // TV: redirige vers /login-basic (Google OAuth bloque sans clavier/souris)
    const ua = req.headers.get("user-agent") ?? "";
    const isTV =
      TV_UA_REGEX.test(ua) ||
      req.cookies.get("laraplay_legacy_tv")?.value === "1";
    const loginPath = isTV ? "/login-basic" : "/login";
    const loginUrl = new URL(loginPath, `${redirectOrigin}/`);
    if (!isTV) {
      loginUrl.searchParams.set(
        "callbackUrl",
        `${req.nextUrl.pathname}${req.nextUrl.search}`,
      );
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
