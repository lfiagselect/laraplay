// LARAPLAY — Endpoint keepalive + warm cache
// GET /api/ping → trigger getCatalog() pour maintenir cache process chaud.
// Cron externe (cron-job.org) tape ce endpoint ~chaque 5 min pour éviter cold start.
// Public (pas d'auth) — pas de data sensible exposée.

import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  let videosCount = 0;
  let cacheHit = false;
  try {
    const cat = await getCatalog();
    videosCount = cat.all.length;
    // Si getCatalog rend < 50ms = cache hit, sinon cold fetch
    cacheHit = Date.now() - start < 200;
  } catch {
    // ignore: catalog peut échouer en cold start avec creds manquantes en preview
  }
  return new Response(
    JSON.stringify({
      ok: true,
      ts: Date.now(),
      videos: videosCount,
      cacheHit,
      ms: Date.now() - start,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );
}
