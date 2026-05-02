// LARAPLAY — Audit formats vidéo
// GET /api/admin/formats → liste vidéos groupées par mimeType.
// Identifie celles qui ne sont pas video/mp4 (besoin re-encode).
// Auth admin only.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const catalog = await getCatalog();

  // Groupe par mimeType
  const byMime = new Map<string, Array<{ id: string; name: string; size: string | null; category: string | null; driveUrl: string }>>();
  for (const v of catalog.all) {
    const mime = v.mimeType;
    if (!byMime.has(mime)) byMime.set(mime, []);
    byMime.get(mime)!.push({
      id: v.id,
      name: v.name,
      size: v.size ?? null,
      category: v.category ?? null,
      driveUrl: `https://drive.google.com/file/d/${v.id}/view`,
    });
  }

  // Construit summary + détails non-mp4
  const summary: Array<{ mimeType: string; count: number; totalGb: number }> = [];
  const nonMp4: typeof byMime extends Map<string, infer T> ? T : never = [];

  for (const [mime, vids] of byMime) {
    const totalBytes = vids.reduce((s, v) => s + (Number(v.size) || 0), 0);
    summary.push({
      mimeType: mime,
      count: vids.length,
      totalGb: Math.round((totalBytes / 1_000_000_000) * 10) / 10,
    });
    if (mime !== "video/mp4") {
      nonMp4.push(...vids);
    }
  }

  summary.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalVideos: catalog.all.length,
    summary,
    nonMp4Count: nonMp4.length,
    nonMp4,
  }, { headers: { "cache-control": "no-store" } });
}
