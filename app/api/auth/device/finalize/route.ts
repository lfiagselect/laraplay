// LARAPLAY — Finalisation serveur du Device Flow pour navigateurs TV anciens.
// Permet à une page HTML à meta-refresh de poser le cookie NextAuth sans JS client.

import { NextResponse } from "next/server";
import { signIn } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectNoStore(url: string | URL) {
  const res = NextResponse.redirect(url, 303);
  res.headers.set("cache-control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("pragma", "no-cache");
  res.headers.set("expires", "0");
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceCode = url.searchParams.get("device_code");
  if (!deviceCode) {
    return redirectNoStore(new URL("/login-basic", req.url));
  }

  const redirectUrl = await signIn("device", {
    device_code: deviceCode,
    redirect: false,
    redirectTo: "/",
  });

  return redirectNoStore(new URL(typeof redirectUrl === "string" ? redirectUrl : "/", req.url));
}
