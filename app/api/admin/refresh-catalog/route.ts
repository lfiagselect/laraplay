// LARAPLAY – Refresh catalogue Bunny (invalide le cache unstable_cache)
import { auth } from "@/auth";
import { revalidateTag } from "next/cache";
import { listAllVideos } from "@/lib/bunny";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  revalidateTag("catalog", "layout");
  const videos = await listAllVideos();
  const ms = Date.now() - start;

  return NextResponse.json({ videos: videos.length, ms });
}