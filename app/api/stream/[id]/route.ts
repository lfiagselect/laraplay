// LARAPLAY — Stream proxy
// GET /api/stream/[id] → pipe contenu vidéo Drive via fetch direct.
// Support Range (seek). User jamais voit URL Drive. Auth Phase 5.

import { NextRequest } from "next/server";
import { fetchDriveStream, getVideo } from "@/lib/drive";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const meta = await getVideo(id);
  if (!meta) {
    return new Response("Not found", { status: 404 });
  }

  const range = req.headers.get("range") ?? undefined;

  try {
    const driveRes = await fetchDriveStream(id, range);

    if (!driveRes.ok && driveRes.status !== 206) {
      const text = await driveRes.text();
      console.error("[stream] Drive error", driveRes.status, text);
      return new Response(`Drive error ${driveRes.status}: ${text}`, {
        status: driveRes.status,
      });
    }

    // Forward headers
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
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", meta.mimeType);
    }

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Stream error: ${msg}`, { status: 500 });
  }
}
