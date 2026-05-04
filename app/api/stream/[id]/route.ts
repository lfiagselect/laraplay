// LARAPLAY — Stream signed URL
// GET /api/stream/[id] → retourne { url, expiresAt } JSON
// Le browser streame directement depuis Drive (zéro bandwidth Render).
// Range/seek géré nativement par Drive côté browser.
// Logs timing conservés sur la génération d'URL.

import { NextRequest, NextResponse } from "next/server";
import { getStreamUrl } from "@/lib/drive";
import { getCatalog } from "@/lib/catalog";
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

  // Vérification existence vidéo via catalog cache (byId Map) → 0ms
  // Fallback Drive direct si miss catalog
  let meta = catalog.byId.get(id);
  let metaSource: "cache" | "drive" = "cache";
  if (!meta) {
    metaSource = "drive";
    const fresh = await getVideo(id);
    if (!fresh) return new Response("Not found", { status: 404 });
    meta = fresh;
  }

  const { url, expiresAt } = await getStreamUrl(id);

  const total = Math.round(performance.now() - t0);
  console.log(
    `[stream] id=${id} kind=signed total=${total}ms metaSource=${metaSource} expiresAt=${new Date(expiresAt).toISOString()}`
  );

  return NextResponse.json({ url, expiresAt }, {
    headers: {
      // Private : auth requise pour obtenir l'URL, browser peut garder 40min
      "Cache-Control": "private, max-age=2400",
    },
  });
}