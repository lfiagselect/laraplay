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

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("pragma", "no-cache");
  res.headers.set("expires", "0");
  return res;
}

async function readDeviceCode(req: Request): Promise<string | null> {
  try {
    if (req.method === "GET") {
      return new URL(req.url).searchParams.get("device_code");
    }
    const body = await req.json();
    return typeof body?.device_code === "string" ? body.device_code : null;
  } catch {
    return null;
  }
}

async function handlePoll(req: Request) {
  const deviceCode = await readDeviceCode(req);
  if (!deviceCode) {
    return jsonNoStore({ error: "invalid_request" }, { status: 400 });
  }

  const session = await getByDeviceCode(deviceCode);
  if (!session) {
    return jsonNoStore({ status: "expired" });
  }

  // Ne jamais throttler un état terminal: sur vieux navigateurs TV, une réponse
  // 429 ou mise en cache peut laisser l'écran bloqué sur "En attente".
  if (session.status === "approved") {
    return jsonNoStore({
      status: "approved",
      email: session.email,
    });
  }
  if (session.status === "expired" || session.status === "denied") {
    return jsonNoStore({ status: session.status });
  }

  if (!(await canPoll(deviceCode))) {
    return jsonNoStore({ status: "slow_down" }, { status: 429 });
  }

  return jsonNoStore({ status: session.status });
}

export async function GET(req: Request) {
  return handlePoll(req);
}

export async function POST(req: Request) {
  return handlePoll(req);
}
