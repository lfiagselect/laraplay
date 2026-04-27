// LARAPLAY — Test lecture whitelist Sheet
// GET /api/whitelist/test → renvoie liste emails (masqués partiellement)

import { NextResponse } from "next/server";
import { getWhitelist } from "@/lib/whitelist";

export const dynamic = "force-dynamic";

function mask(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function GET() {
  try {
    const wl = await getWhitelist(true);
    return NextResponse.json({
      ok: true,
      count: wl.length,
      entries: wl.map((e) => ({
        email: mask(e.email),
        name: e.name,
        active: e.active,
        role: e.role,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
