// LARAPLAY — Stream proxy
// GET /api/stream/[id] → proxie le stream Drive via le serveur
// Évite le blocage Google "automated queries" quand le browser appelle Drive directement.

import { NextRequest } from "next/server";
import { fetchDriveStream } from "@/lib/drive";
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
  const range = req.headers.get("range") ?? undefined;

  const driveRes = await fetchDriveStream(id, range);

  if (!driveRes.ok && driveRes.status !== 206) {
    return new Response(`Drive error: ${driveRes.status}`, { status: driveRes.status });
  }

  const headers = new Headers();
  const contentType = driveRes.headers.get("content-type");
  const contentLength = driveRes.headers.get("content-length");
  const contentRange = driveRes.headers.get("content-range");
  const acceptRanges = driveRes.headers.get("accept-ranges");

  if (contentType) headers.set("content-type", contentType);
  if (contentLength) headers.set("content-length", contentLength);
  if (contentRange) headers.set("content-range", contentRange);
  if (acceptRanges) headers.set("accept-ranges", acceptRanges);
  headers.set("cache-control", "private, max-age=0");

  return new Response(driveRes.body, {
    status: driveRes.status,
    headers,
  });
}
