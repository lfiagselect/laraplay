// LARAPLAY — Endpoint vidéo metadata + similaires
// GET /api/video/[id] → { video, related[] }
// Lookup via catalog.byId (cache 1h) — Bunny source de vérité.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const catalog = await getCatalog();

  const video = catalog.byId.get(id) ?? null;
  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const related = video.category
    ? (catalog.byCategory.get(video.category) ?? [])
        .filter((v) => v.id !== video!.id)
        .slice(0, 12)
    : [];

  return NextResponse.json({ video, related });
}