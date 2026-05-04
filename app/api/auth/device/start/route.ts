// LARAPLAY — Device Flow START.
// POST /api/auth/device/start
// Génère device_code + user_code → renvoie au TV.
// Public (pas auth requise).

import { NextResponse } from "next/server";
import { createDeviceSession, DEVICE_FLOW_CONFIG } from "@/lib/device-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const session = createDeviceSession();
  const origin = getPublicOrigin(req);

  return NextResponse.json({
    device_code: session.deviceCode,
    user_code: session.userCode,
    verification_uri: `${origin}/d`,
    verification_uri_complete: `${origin}/d?code=${encodeURIComponent(session.userCode)}`,
    expires_in: DEVICE_FLOW_CONFIG.expiresInSec,
    interval: DEVICE_FLOW_CONFIG.pollIntervalSec,
  });
}
