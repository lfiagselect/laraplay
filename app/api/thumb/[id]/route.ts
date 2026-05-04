// LARAPLAY — Thumbnail signed URL
// Drive thumbnailLink → retourne { url } JSON
// Le browser charge l'image directement depuis Drive (zéro bandwidth Render).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getThumbUrl } from "@/lib/drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [session, url] = await Promise.all([auth(), getThumbUrl(id)]);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!url) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.json({ url }, {
    headers: {
      // Thumbnails Drive changent rarement — browser cache 24h
      "Cache-Control": "private, max-age=86400",
    },
  });
}