// LARAPLAY — Device Flow START.
// POST /api/auth/device/start
// Génère device_code + user_code → renvoie au TV.
// Public (pas auth requise).

import { NextResponse } from "next/server";
import { createDeviceSession, DEVICE_FLOW_CONFIG } from "@/lib/device-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("pragma", "no-cache");
  res.headers.set("expires", "0");
  return res;
}

/**
 * Détermine l'origine publique du site, en respectant les proxys (Render, Vercel, etc.).
 * Ordre de priorité :
 * 1. NEXTAUTH_URL (config explicite)
 * 2. Headers x-forwarded-* (proxy)
 * 3. host header
 * 4. Fallback req.url
 */
function getPublicOrigin(req: Request): string {
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).origin;
    } catch {
      // ignore, fallback
    }
  }
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const session = await createDeviceSession();
    const origin = getPublicOrigin(req);

    return jsonNoStore({
      device_code: session.deviceCode,
      user_code: session.userCode,
      verification_uri: `${origin}/d`,
      verification_uri_complete: `${origin}/d?device=${encodeURIComponent(session.userCode)}`,
      expires_in: DEVICE_FLOW_CONFIG.expiresInSec,
      interval: DEVICE_FLOW_CONFIG.pollIntervalSec,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[device/start] failed:", msg);
    return jsonNoStore(
      { error: "device_start_failed", detail: msg.slice(0, 200) },
      { status: 500 }
    );
  }
}
