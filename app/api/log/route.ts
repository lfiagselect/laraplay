// LARAPLAY — Log endpoint pour KPI client
// POST /api/log { events: PerfEvent[] }
// Stocke en console structuré (Vercel Logs capture).
// Pas auth — events anonymes, low risk. Rate-limit basique via taille body.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 8 * 1024; // 8KB

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const events = (body as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "events must be array" }, { status: 400 });
  }

  // Format structuré → Vercel logs aggregable.
  // Ligne par event: [perf] type=... videoId=... ms=... meta=...
  for (const e of events.slice(0, 20)) {
    if (typeof e !== "object" || !e) continue;
    const ev = e as Record<string, unknown>;
    const meta = ev.meta && typeof ev.meta === "object"
      ? Object.entries(ev.meta as Record<string, unknown>)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(" ")
      : "";
    console.log(
      `[perf] type=${ev.type} videoId=${ev.videoId ?? "-"} ms=${ev.ms} ts=${ev.ts} ${meta}`
    );
  }

  return NextResponse.json({ ok: true });
}
