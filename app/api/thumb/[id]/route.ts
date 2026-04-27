// LARAPLAY — Thumbnail proxy
// Drive thumbnailLink expire — on proxify pour servir image stable.
// GET /api/thumb/[id] → image PNG/JPEG.

import { NextRequest } from "next/server";
import { google } from "googleapis";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getToken(): Promise<string> {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

  let auth_;
  if (inlineJson) {
    auth_ = new google.auth.GoogleAuth({ credentials: JSON.parse(inlineJson), scopes });
  } else if (keyFile) {
    auth_ = new google.auth.GoogleAuth({ keyFile, scopes });
  } else throw new Error("Google credentials missing");

  const client = await auth_.getClient();
  const tokenResp = await client.getAccessToken();
  if (!tokenResp.token) throw new Error("No token");
  return tokenResp.token;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const token = await getToken();
    // Demande thumbnail via API Drive (renvoie redirect vers image)
    const url = `https://www.googleapis.com/drive/v3/files/${id}?fields=thumbnailLink&supportsAllDrives=true`;
    const metaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return new Response("Not found", { status: 404 });
    const meta = await metaRes.json();
    const thumbLink: string | undefined = meta.thumbnailLink;
    if (!thumbLink) return new Response("No thumbnail", { status: 404 });

    // Récupère image avec auth bearer
    const imgRes = await fetch(thumbLink, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!imgRes.ok) return new Response("Thumbnail fetch failed", { status: 502 });

    const headers = new Headers();
    headers.set("content-type", imgRes.headers.get("content-type") ?? "image/jpeg");
    headers.set("cache-control", "public, max-age=86400, immutable");
    return new Response(imgRes.body, { status: 200, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Thumb error: ${msg}`, { status: 500 });
  }
}
