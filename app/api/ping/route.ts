// LARAPLAY — Ping warmup endpoint
// GET /api/ping → 200 + warm catalog cache.
// Appelé par cron Vercel toutes 5 min pour éviter cold start serverless.
// Pas auth — endpoint public lite (zéro data exposée).

import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const t0 = Date.now();
  try {
    // Touche catalog → unstable_cache hit ou refresh.
    // Garde fonction chaude + Drive auth token pré-cachée.
    const catalog = await getCatalog();
    const ms = Date.now() - t0;
    return NextResponse.json(
      { ok: true, videos: catalog.all.length, ms },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    const ms = Date.now() - t0;
    return NextResponse.json(
      { ok: false, ms, error: err instanceof Error ? err.message : "unknown" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
