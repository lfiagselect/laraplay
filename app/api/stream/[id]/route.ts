// LARAPLAY — Stream redirect
// GET /api/stream/[id] → redirect 302 vers URL Drive signée.
// Le browser suit nativement (pas de CORS sur media).
// Render ne transporte aucun byte vidéo — zéro bandwidth.

import { NextRequest, NextResponse } from "next/server";
import { getStreamUrl } from "@/lib/drive";
import { getCatalog, } from "@/lib/catalog";
import { getVideo } from "@/lib/drive";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t0 = performance.now();
  const { id } = await params;

  const [session, catalog] = await Promise.all([
    auth(),
    getCatalog(),
  ]);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  let meta = catalog.byId.get(id);
  let metaSource: "cache" | "drive" = "cache";
  if (!meta) {
    metaSource = "drive";
    const fresh = await getVideo(id);
    if (!fresh) return new Response("Not found", { status: 404 });
    meta = fresh;
  }

  const { url } = await getStreamUrl(id);

  const total = Math.round(performance.now() - t0);
  console.log(`[stream] id=${id} kind=redirect total=${total}ms metaSource=${metaSource}`);

  return NextResponse.redirect(url, { status: 302 });
}