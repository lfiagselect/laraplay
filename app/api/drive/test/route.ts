// LARAPLAY — Test connexion Drive
// GET /api/drive/test → renvoie compte vidéos + 5 premières

import { NextResponse } from "next/server";
import { listAllVideos } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    return NextResponse.json({ error: "GOOGLE_DRIVE_FOLDER_ID missing" }, { status: 500 });
  }

  try {
    const videos = await listAllVideos(folderId);
    return NextResponse.json({
      ok: true,
      count: videos.length,
      sample: videos.slice(0, 5).map((v) => ({
        id: v.id,
        name: v.name,
        mime: v.mimeType,
        size: v.size,
        category: v.category,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
