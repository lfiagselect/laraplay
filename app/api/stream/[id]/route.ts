// LARAPLAY — Stream proxy
// GET /api/stream/[id] → pipe contenu vidéo Drive via fetch direct.
// Support Range (seek). User jamais voit URL Drive.
// Optim: 1ère request = full check. Sub-séquentes Range = skip getVideo (gain).

import { NextRequest } from "next/server";
import { fetchDriveStream, getVideo } from "@/lib/drive";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const range = req.headers.get("range") ?? undefined;

  // Détection Range avancée: si user demande à partir d'un byte > 0,
  // c'est forcément une continuation de lecture (browser a déjà 1er chunk + meta).
  // On peut skip getVideo (gain ~300-500ms par chunk).
  const isContinuationRange = range
    ? !!range.match(/bytes=([1-9]\d*)-/) // bytes=N- avec N>0
    : false;

  // Auth check obligatoire (sécurité)
  const authPromise = auth();

  if (isContinuationRange) {
    // Path optimisé: pas de getVideo, juste auth + stream
    const [session, driveRes] = await Promise.all([
      authPromise,
      fetchDriveStream(id, range),
    ]);

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    return forwardResponse(driveRes);
  }

  // Path complet: 1ère request, on vérifie meta
  const [session, meta, driveRes] = await Promise.all([
    authPromise,
    getVideo(id),
    fetchDriveStream(id, range),
  ]);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!meta) {
    return new Response("Not found", { status: 404 });
  }

  return forwardResponse(driveRes, meta.mimeType);
}

function forwardResponse(driveRes: Response, fallbackMime?: string): Response {
  if (!driveRes.ok && driveRes.status !== 206) {
    return new Response(`Drive error ${driveRes.status}`, {
      status: driveRes.status,
    });
  }

  const responseHeaders = new Headers();
  const forwardable = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "etag",
    "last-modified",
  ];
  for (const h of forwardable) {
    const v = driveRes.headers.get(h);
    if (v) responseHeaders.set(h, v);
  }
  if (!responseHeaders.has("accept-ranges")) {
    responseHeaders.set("accept-ranges", "bytes");
  }
  if (!responseHeaders.has("content-type") && fallbackMime) {
    responseHeaders.set("content-type", fallbackMime);
  }

  return new Response(driveRes.body, {
    status: driveRes.status,
    headers: responseHeaders,
  });
}
