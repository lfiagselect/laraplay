// LARAPLAY — Endpoint vidéo metadata + similaires
// GET /api/video/[id] → { video, related[] }
// Utilisé par modal info au clic card.
// Lookup via catalog.byId (cache 1h) — 0ms vs getVideo Drive cold.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVideo } from "@/lib/drive";
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

  let video = catalog.byId.get(id) ?? null;
  // Fallback: vidéo récente pas encore en cache catalog
  if (!video) {
    video = await getVideo(id);
  }
  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const related = video.category
    ? (catalog.byCategory.get(video.category) ?? [])
        .filter((v) => v.id !== video.id)
        .slice(0, 12)
    : [];

  return NextResponse.json({ video, related });
}
