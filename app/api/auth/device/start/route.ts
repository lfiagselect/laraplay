// LARAPLAY — Device Flow START.
// POST /api/auth/device/start
// Génère device_code + user_code → renvoie au TV.
// Public (pas auth requise).

import { NextResponse } from "next/server";
import { createDeviceSession, DEVICE_FLOW_CONFIG } from "@/lib/device-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = createDeviceSession();
  const origin = new URL(req.url).origin;

  return NextResponse.json({
    device_code: session.deviceCode,
    user_code: session.userCode,
    verification_uri: `${origin}/d`,
    verification_uri_complete: `${origin}/d?code=${encodeURIComponent(session.userCode)}`,
    expires_in: DEVICE_FLOW_CONFIG.expiresInSec,
    interval: DEVICE_FLOW_CONFIG.pollIntervalSec,
  });
}
