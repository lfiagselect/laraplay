// LARAPLAY — Stream proxy server-side
// GET /api/stream/[id] → vérifie auth + catalog, puis redirect 302 vers URL signée Drive.
// Le token OAuth reste caché côté serveur (jamais visible dans le HTML/JS).
// Le browser streame Drive directement — zéro bytes via Netlify.
// Auth requise.

import { NextRequest } from "next/server";
import { getStreamUrl } from "@/lib/drive";
import { getCatalog } from "@/lib/catalog";
import { getVideo } from "@/lib/drive";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [session, catalog] = await Promise.all([auth(), getCatalog()]);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Vérification existence vidéo
  let meta = catalog.byId.get(id);
  if (!meta) {
    const fresh = await getVideo(id);
    if (!fresh) return new Response("Not found", { status: 404 });
  }

  const { url } = await getStreamUrl(id);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
    },
  });
}
