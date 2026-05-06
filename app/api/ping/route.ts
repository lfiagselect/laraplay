// LARAPLAY — Endpoint keepalive
// GET /api/ping → pong. Utilisé par cron externe (cron-job.org) pour maintenir
// le cache catalog chaud sur Netlify.
// Public (pas d'auth) — léger, juste un ping HTTP.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, ts: Date.now() }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );
}
