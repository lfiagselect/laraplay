// LARAPLAY — API admin whitelist (Sheet)
// GET    /api/admin/whitelist → liste users
// POST   /api/admin/whitelist { email, name?, role?, active? } → ajoute/update
// DELETE /api/admin/whitelist?email=...&hard=1 → désactive (default) ou supprime (hard=1)
// Auth admin only (role check via session).

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getWhitelist,
  addOrUpdateUser,
  deactivateUser,
  removeUser,
} from "@/lib/whitelist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "unauthorized" as const, status: 401 };
  }
  if (session.user.role !== "admin") {
    return { error: "forbidden" as const, status: 403 };
  }
  return { session };
}

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const users = await getWhitelist(true); // force refresh
  return NextResponse.json(
    { users },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { email, name, role, active } = body as {
    email?: unknown;
    name?: unknown;
    role?: unknown;
    active?: unknown;
  };

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "email requis et valide" }, { status: 400 });
  }
  const safeRole = role === "admin" ? "admin" : "user";
  const safeName = typeof name === "string" ? name : "";
  const safeActive = active === false ? false : true;

  try {
    const entry = await addOrUpdateUser({
      email,
      name: safeName,
      role: safeRole,
      active: safeActive,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const hard = url.searchParams.get("hard") === "1";

  if (!email) {
    return NextResponse.json({ error: "email param requis" }, { status: 400 });
  }

  try {
    const ok = hard ? await removeUser(email) : await deactivateUser(email);
    if (!ok) {
      return NextResponse.json({ error: "email introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, mode: hard ? "removed" : "deactivated" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
