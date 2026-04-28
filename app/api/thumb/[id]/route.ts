// LARAPLAY — Thumbnail proxy
// Drive thumbnailLink expire — on proxify pour servir image stable cache CDN.

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { fetchDriveThumb } from "@/lib/drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth + thumb en parallèle.
  const [session, thumbRes] = await Promise.all([auth(), fetchDriveThumb(id)]);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!thumbRes) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("content-type", thumbRes.contentType ?? "image/jpeg");
  // Cache CDN long: thumbs Drive changent rarement
  headers.set("cache-control", "public, max-age=86400, s-maxage=86400, immutable");
  return new Response(thumbRes.body, { status: 200, headers });
}
