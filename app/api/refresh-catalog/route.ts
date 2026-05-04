// LARAPLAY — Refresh catalog cache (utilisateur connecté)
// POST /api/refresh-catalog
// Invalide :
//   - Data Cache "catalog" (unstable_cache) → catalog re-fetché Drive
//   - Routes statiques (home, categories, eras, my-list) → HTML regen
// Auth : tout user logged-in (pas seulement admin).

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidateTag, revalidatePath } from "next/cache";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  try {
    revalidateTag("catalog", { expire: 0 });
    revalidatePath("/", "layout");
    revalidatePath("/categories");
    revalidatePath("/eras");
    revalidatePath("/my-list");
    revalidatePath("/search");

    const catalog = await getCatalog();
    const ms = Date.now() - t0;

    return NextResponse.json(
      { ok: true, videos: catalog.all.length, ms },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
