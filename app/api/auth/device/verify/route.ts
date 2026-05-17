// LARAPLAY — Device Flow VERIFY.
// POST /api/auth/device/verify { user_code }
// Appelé depuis phone (page /d) après que user soit auth Google + whitelisted.
// Marque session approved + email. TV poll prochain → reçoit approved.
// REQUIERT auth (cookie session NextAuth phone).

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { approveDevice, getByUserCode } from "@/lib/device-flow";
import { isAuthorized } from "@/lib/whitelist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("pragma", "no-cache");
  res.headers.set("expires", "0");
  return res;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return jsonNoStore({ error: "unauthenticated" }, { status: 401 });
  }
  const email = session.user.email;

  // Re-check whitelist (sécurité défense)
  const wl = await isAuthorized(email);
  if (!wl) {
    return jsonNoStore({ error: "not_whitelisted" }, { status: 403 });
  }

  let body: { user_code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "invalid_request" }, { status: 400 });
  }
  const userCode = body.user_code;
  if (!userCode || typeof userCode !== "string") {
    return jsonNoStore({ error: "invalid_request" }, { status: 400 });
  }

  const found = await getByUserCode(userCode);
  if (!found) {
    return jsonNoStore({ error: "invalid_code" }, { status: 404 });
  }
  if (found.status === "expired") {
    return jsonNoStore({ error: "expired" }, { status: 410 });
  }
  if (found.status === "approved") {
    return jsonNoStore({ ok: true, already: true });
  }

  const updated = await approveDevice(userCode, email);
  if (!updated || updated.status !== "approved") {
    return jsonNoStore({ error: "approval_failed" }, { status: 500 });
  }

  return jsonNoStore({ ok: true, email });
}
