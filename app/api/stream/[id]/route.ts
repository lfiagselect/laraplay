// LARAPLAY — Stream proxy server-side
// GET /api/stream/[id] → proxifie les bytes Drive vers le browser.
// Le token OAuth reste côté serveur — jamais exposé dans l'URL.
// Range requests supportés pour le seek vidéo.
// Auth requise.

import { NextRequest } from "next/server";
import { fetchDriveStream } from "@/lib/drive";
import { getCatalog } from "@/lib/catalog";
import { getVideo } from "@/lib/drive";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
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

  // Transfert du Range header pour le seek
  const range = req.headers.get("range") ?? undefined;

  const driveRes = await fetchDriveStream(id, range);

  if (!driveRes.ok && driveRes.status !== 206) {
    return new Response("Drive error", { status: driveRes.status });
  }

  // Propagation des headers nécessaires au player
  const headers = new Headers();
  const propagate = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
  ];
  for (const h of propagate) {
    const val = driveRes.headers.get(h);
    if (val) headers.set(h, val);
  }
  headers.set("cache-control", "private, max-age=2400");

  return new Response(driveRes.body, {
    status: driveRes.status,
    headers,
  });
}
