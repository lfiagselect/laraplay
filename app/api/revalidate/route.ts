// LARAPLAY — Endpoint revalidation pour webhooks externes
// POST /api/revalidate?secret=REVALIDATE_SECRET

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("catalog", "fetch");
    revalidatePath("/", "layout");
    revalidatePath("/categories");
    revalidatePath("/eras");
    revalidatePath("/my-list");
    revalidatePath("/search");

    const source = req.nextUrl.searchParams.get("source") ?? "unknown";
    console.log(`[revalidate] triggered by ${source} at ${new Date().toISOString()}`);

    return NextResponse.json({ ok: true, source });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
