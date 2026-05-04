// LARAPLAY — Force refresh catalog cache
// POST /api/admin/refresh-catalog
// Invalide :
//   - Data Cache "catalog" (unstable_cache) → catalog re-fetché Drive
//   - Routes statiques (home, categories, eras, my-list) → HTML regen
// Effet : tous les users (pas que toi) voient les nouvelles vidéos.
// Auth admin only.

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
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const t0 = Date.now();
  try {
    // 1. Invalide Data Cache catalogue (toutes instances Vercel)
    revalidateTag("catalog", { expire: 0 });

    // 2. Invalide HTML pré-rendu des routes qui dépendent du catalog
    //    Sans ça, les autres users voient l'ancienne home en cache CDN jusqu'à 1h.
    revalidatePath("/", "layout");
    revalidatePath("/categories");
    revalidatePath("/eras");
    revalidatePath("/my-list");
    revalidatePath("/search");

    // 3. Re-fetch immédiat pour warm le nouveau cache
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
