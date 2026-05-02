// LARAPLAY — Stream proxy
// GET /api/stream/[id] → pipe contenu vidéo Drive via fetch direct.
// Support Range (seek). User jamais voit URL Drive.
// Optim: meta lookup via catalog cache (byId Map) → 0ms vs 300-500ms getVideo.
// Fallback Drive direct si miss catalog.
// Logs timing: TTFB Drive + total request → Vercel logs.

import { NextRequest } from "next/server";
import { fetchDriveStream, getVideo } from "@/lib/drive";
import { getCatalog } from "@/lib/catalog";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t0 = performance.now();
  const { id } = await params;
  const range = req.headers.get("range") ?? undefined;

  const isContinuationRange = range
    ? !!range.match(/bytes=([1-9]\d*)-/)
    : false;

  const authPromise = auth();
  const tDrive0 = performance.now();

  if (isContinuationRange) {
    const [session, driveRes] = await Promise.all([
      authPromise,
      fetchDriveStream(id, range),
    ]);

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const total = Math.round(performance.now() - t0);
    const driveMs = Math.round(performance.now() - tDrive0);
    console.log(`[stream] id=${id} kind=range total=${total}ms drive=${driveMs}ms status=${driveRes.status}`);

    return forwardResponse(driveRes);
  }

  const [session, catalog, driveRes] = await Promise.all([
    authPromise,
    getCatalog(),
    fetchDriveStream(id, range),
  ]);
  const driveMs = Math.round(performance.now() - tDrive0);

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

  const total = Math.round(performance.now() - t0);
  console.log(
    `[stream] id=${id} kind=initial total=${total}ms drive=${driveMs}ms metaSource=${metaSource} status=${driveRes.status}`
  );

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
