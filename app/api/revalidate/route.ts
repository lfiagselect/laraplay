// LARAPLAY — Endpoint revalidation pour webhooks externes
// POST /api/revalidate?secret=REVALIDATE_SECRET
//
// Appelé par :
//   - Google Apps Script (trigger Drive onFileCreated)
//   - Bunny Stream webhook (VideoEncoded)
//
// Sécurité : secret en query param comparé à REVALIDATE_SECRET (env Netlify)
// Action : revalidateTag("catalog") + revalidatePath layout
// Résultat : prochain visiteur déclenche un re-fetch Drive complet

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    revalidateTag("catalog");
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

// GET pour test manuel depuis le navigateur (admin)
export async function GET(req: NextRequest) {
  return POST(req);
}
