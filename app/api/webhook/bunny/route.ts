// LARAPLAY — Webhook Bunny Stream
// POST /api/webhook/bunny?secret=BUNNY_WEBHOOK_SECRET
// Bunny envoie payload sur évènements vidéo (upload, encode, delete).
// On purge le cache catalog process pour que la prochaine requête refetch Bunny.
//
// Config Bunny: dash.bunny.net → Stream library → Webhooks → Add webhook
//   URL: https://laraplay.netlify.app/api/webhook/bunny?secret=XXX
//   Events: VideoUploaded, VideoEncoded, VideoFailed, VideoDeleted
//
// Sécurité: secret en query string (Bunny ne signe pas HMAC).
// Si secret manquant ou faux → 401.

import { NextRequest, NextResponse } from "next/server";
import { invalidateCatalogCache } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BunnyWebhookPayload {
  VideoLibraryId?: number;
  VideoGuid?: string;
  Status?: number; // 0=Created, 1=Uploaded, 2=Processing, 3=Transcoding, 4=Finished, 5=Error, 6=UploadFailed
  // Pas d'event type explicite — déduit du Status
}

async function handle(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.BUNNY_WEBHOOK_SECRET;

  // DEBUG temporaire — révèle source du 401 (longueurs, pas valeurs)
  // À retirer dès que webhook OK
  console.log(
    `[webhook/bunny] debug expectedLen=${expected?.length ?? "undef"} ` +
    `receivedLen=${secret?.length ?? "undef"} ` +
    `expectedFirst3=${expected?.slice(0, 3) ?? "-"} ` +
    `receivedFirst3=${secret?.slice(0, 3) ?? "-"} ` +
    `match=${expected === secret}`
  );

  if (!expected || secret !== expected) {
    console.warn("[webhook/bunny] unauthorized: bad secret");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: BunnyWebhookPayload = {};
  try {
    payload = await req.json();
  } catch {
    // Bunny envoie parfois body vide — pas bloquant
  }

  const status = payload.Status;
  const guid = payload.VideoGuid ?? "-";

  // Status 4 = Finished (transcoded, prêt à diffuser) → seul cas où on purge
  // Status 5/6 = erreur → purge aussi (la vidéo a été ajoutée/retirée)
  // Status 1-3 = en cours → ignore (évite rafales)
  // Pas de Status (delete) → purge
  const shouldPurge = status === undefined || status === 4 || status === 5 || status === 6;

  if (shouldPurge) {
    invalidateCatalogCache();
    console.log(`[webhook/bunny] cache purged · video=${guid} status=${status ?? "delete"}`);
  } else {
    console.log(`[webhook/bunny] skip · video=${guid} status=${status}`);
  }

  return NextResponse.json({ ok: true, purged: shouldPurge, status });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET utile pour tester la config (curl rapide)
export async function GET(req: NextRequest) {
  return handle(req);
}
