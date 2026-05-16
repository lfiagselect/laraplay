// LARAPLAY – Catalogue (source : Bunny Stream API)
import "server-only";
import { listAllVideos, type VideoFile } from "./bunny";

export { THEMATIC_ROWS, ERAS, slugify, unslugify, categoryKey, categoryMatches } from "./catalog-meta";
export type { VideoFile };

export interface Catalog {
  all: VideoFile[];
  byCategory: Map<string, VideoFile[]>;
  byId: Map<string, VideoFile>;
  recents: VideoFile[];
  top10: VideoFile[];
  recentAdds: VideoFile[];
  hero: VideoFile | null;
}

// Cache mémoire process — fonctionne sur Netlify
let cacheData: {
  all: VideoFile[];
  recents: VideoFile[];
  top10: VideoFile[];
  recentAdds: VideoFile[];
  hero: VideoFile | null;
} | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 3600 * 1000; // 1h

export function invalidateCatalogCache() {
  cacheData = null;
  cacheExpiry = 0;
}

async function fetchCatalogRaw() {
  const now = Date.now();
  if (cacheData && now < cacheExpiry) return cacheData;

  console.log("[catalog] fetching from Bunny...");
  const all = await listAllVideos();
  console.log(`[catalog] got ${all.length} videos`);

  const recents = [...all]
    .sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""))
    .slice(0, 16);

  const top10 = [...all]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 10);

  const recentAdds = [...all]
    .sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""))
    .slice(0, 4);

  cacheData = { all, recents, top10, recentAdds, hero: recents[0] ?? null };
  cacheExpiry = now + CACHE_TTL;
  return cacheData;
}

export async function getCatalog(): Promise<Catalog> {
  const raw = await fetchCatalogRaw();

  const byCategory = new Map<string, VideoFile[]>();
  const byId = new Map<string, VideoFile>();

  for (const v of raw.all) {
    const cat = v.category ?? "Lara Fabian - Divers";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(v);
    byId.set(v.id, v);
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""));
  }

  return {
    all: raw.all,
    byCategory,
    byId,
    recents: raw.recents,
    top10: raw.top10,
    recentAdds: raw.recentAdds,
    hero: raw.hero,
  };
}
