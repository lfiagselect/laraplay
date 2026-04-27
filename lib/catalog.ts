// LARAPLAY — Catalogue logique métier (server-only)
// Charge données Drive, groupe par catégorie, cache mémoire.
// IMPORTANT: ne pas importer dans composants client → utiliser catalog-meta.ts.

import "server-only";
import { listAllVideos, type VideoFile } from "./drive";

export { THEMATIC_ROWS, ERAS, slugify, unslugify } from "./catalog-meta";

export interface Catalog {
  all: VideoFile[];
  byCategory: Map<string, VideoFile[]>;
  recents: VideoFile[];
  hero: VideoFile | null;
}

let cache: { data: Catalog; ts: number } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 min

export async function getCatalog(force = false): Promise<Catalog> {
  const now = Date.now();
  if (!force && cache && now - cache.ts < TTL_MS) return cache.data;

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID missing");

  const all = await listAllVideos(folderId);

  const byCategory = new Map<string, VideoFile[]>();
  for (const v of all) {
    const cat = v.category ?? "Divers";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(v);
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
  }

  const recents = [...all]
    .sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""))
    .slice(0, 16);

  const hero = recents[0] ?? null;

  const data: Catalog = { all, byCategory, recents, hero };
  cache = { data, ts: now };
  return data;
}
