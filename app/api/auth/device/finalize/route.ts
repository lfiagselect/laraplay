// LARAPLAY — Finalisation serveur du Device Flow pour navigateurs TV anciens.
// Permet à une page HTML à meta-refresh de poser le cookie NextAuth sans JS client.
// V2: device_code lu depuis cookie HttpOnly (jamais en query), consommation
// usage-unique dans authorize() (invalid_grant au rejeu).

import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { publicUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEVICE_COOKIE = "laraplay_device";

function cookieValue(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

function redirectNoStore(url: string | URL, opts?: { clearDevice?: boolean; legacy?: boolean }) {
  const res = NextResponse.redirect(url, 303);
  res.headers.set("cache-control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("pragma", "no-cache");
  res.headers.set("expires", "0");
  if (opts?.legacy) {
    res.cookies.set("laraplay_legacy_tv", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (opts?.clearDevice) {
    res.cookies.set(DEVICE_COOKIE, "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  }
  return res;
}

export async function GET(req: Request) {
  if (!rateLimit(`finalize:${clientIp(req)}`, 20, 60_000)) {
    return redirectNoStore(publicUrl(req, "/login-basic"));
  }

  const deviceCode = cookieValue(req, DEVICE_COOKIE);
  if (!deviceCode) {
    return redirectNoStore(publicUrl(req, "/login-basic?new=1"));
  }

  try {
    const redirectUrl = await signIn("device", {
      device_code: deviceCode,
      redirect: false,
      redirectTo: "/",
    });
    return redirectNoStore(
      publicUrl(req, typeof redirectUrl === "string" ? redirectUrl : "/"),
      { clearDevice: true, legacy: true },
    );
  } catch {
    // invalid_grant: code expiré, déjà consommé ou refusé → nouveau code.
    return redirectNoStore(publicUrl(req, "/login-basic?new=1"), { clearDevice: true });
  }
}
