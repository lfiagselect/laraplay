// LARAPLAY – Refresh catalogue Bunny
import { auth } from "@/auth";
import { listAllVideos } from "@/lib/bunny";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const videos = await listAllVideos();
  const ms = Date.now() - start;

  return NextResponse.json({ videos: videos.length, ms });
}