// LARAPLAY — Endpoint keepalive
// GET /api/ping → pong. Utilisé par cron externe pour empêcher Render free tier de dormir.
// Public (pas d'auth) — léger, juste pour réveiller le service.

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
