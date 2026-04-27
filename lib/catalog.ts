// LARAPLAY — Catalogue logique métier (server-only)
// Cache durable via unstable_cache Next (persiste entre invocations serverless).

import "server-only";
import { unstable_cache } from "next/cache";
import { listAllVideos, type VideoFile } from "./drive";

export { THEMATIC_ROWS, ERAS, slugify, unslugify } from "./catalog-meta";

export interface Catalog {
  all: VideoFile[];
  byCategory: Map<string, VideoFile[]>;
  recents: VideoFile[];
  hero: VideoFile | null;
}

interface CatalogSerialized {
  all: VideoFile[];
  recents: VideoFile[];
  hero: VideoFile | null;
}

// Map non sérialisable JSON → on stocke `all` puis on re-construit byCategory au runtime.
const fetchCatalogRaw = unstable_cache(
  async (): Promise<CatalogSerialized> => {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID missing");

    const all = await listAllVideos(folderId);

    const recents = [...all]
      .sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""))
      .slice(0, 16);

    return { all, recents, hero: recents[0] ?? null };
  },
  ["catalog-v1"],
  { revalidate: 600, tags: ["catalog"] } // 10 min cache durable Vercel
);

export async function getCatalog(): Promise<Catalog> {
  const raw = await fetchCatalogRaw();

  const byCategory = new Map<string, VideoFile[]>();
  for (const v of raw.all) {
    const cat = v.category ?? "Divers";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(v);
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
  }

  return {
    all: raw.all,
    byCategory,
    recents: raw.recents,
    hero: raw.hero,
  };
}
