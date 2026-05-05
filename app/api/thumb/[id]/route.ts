// LARAPLAY — Thumbnail proxy
// Drive thumbnailLink → proxie les BYTES de l'image directement.
// Compatible <img src="/api/thumb/ID"> natif (pas de JSON).

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

  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const thumb = await fetchDriveThumb(id);
  if (!thumb || !thumb.body) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(thumb.body, {
    headers: {
      "Content-Type": thumb.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
