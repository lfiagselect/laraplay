// LARAPLAY — Thumbnail proxy
// GET /api/thumb/[id] → récupère l'image depuis Drive et la proxie directement.
// Compatible <img src="/api/thumb/[id]"> sans JS supplémentaire.

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { fetchDriveThumb } from "@/lib/drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const result = await fetchDriveThumb(id);

  if (!result || !result.body) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.body, {
    status: 200,
    headers: {
      "Content-Type": result.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
