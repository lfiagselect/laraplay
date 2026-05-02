// LARAPLAY — Resolve plusieurs vidéos par IDs en 1 call
// POST /api/videos-by-ids { ids: string[] } → { videos: VideoFile[] }
// Sert ContinueWatching + MyList pour éviter bundle 500KB inline.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IDS = 200;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "ids must be string[]" }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ videos: [] });
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: "too many ids" }, { status: 400 });
  }

  const catalog = await getCatalog();
  const videos = (ids as string[])
    .map((id) => catalog.byId.get(id))
    .filter((v): v is NonNullable<typeof v> => !!v);

  return NextResponse.json({ videos });
}
