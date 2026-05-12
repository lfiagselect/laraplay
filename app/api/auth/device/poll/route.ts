// LARAPLAY — Device Flow POLL.
// POST /api/auth/device/poll { device_code }
// TV interroge ce endpoint toutes ~5s.
// Status: pending | approved | expired | denied | slow_down (anti-flood)
// Si approved → set NextAuth-compatible cookie session via Credentials provider.
//
// Cookie strategy:
// - Status approved → renvoie email pour que le TV finalise via signIn("device", { email, deviceCode })
// - Public (pas auth requise).

import { NextResponse } from "next/server";
import { getByDeviceCode, canPoll } from "@/lib/device-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { device_code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const deviceCode = body.device_code;
  if (!deviceCode || typeof deviceCode !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const session = await getByDeviceCode(deviceCode);
  if (!session) {
    return NextResponse.json({ status: "expired" });
  }

  if (!(await canPoll(deviceCode))) {
    return NextResponse.json({ status: "slow_down" }, { status: 429 });
  }

  if (session.status === "approved") {
    return NextResponse.json({
      status: "approved",
      email: session.email,
    });
  }

  return NextResponse.json({ status: session.status });
}
