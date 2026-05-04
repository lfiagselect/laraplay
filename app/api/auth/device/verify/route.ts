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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const email = session.user.email;

  // Re-check whitelist (sécurité défense)
  const wl = await isAuthorized(email);
  if (!wl) {
    return NextResponse.json({ error: "not_whitelisted" }, { status: 403 });
  }

  let body: { user_code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const userCode = body.user_code;
  if (!userCode || typeof userCode !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const found = getByUserCode(userCode);
  if (!found) {
    return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  }
  if (found.status === "expired") {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (found.status === "approved") {
    return NextResponse.json({ ok: true, already: true });
  }

  const updated = approveDevice(userCode, email);
  if (!updated || updated.status !== "approved") {
    return NextResponse.json({ error: "approval_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email });
}
