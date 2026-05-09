// LARAPLAY — Catalogue logique métier (server-only)
// Cache durable via unstable_cache Next (persiste entre invocations serverless).
// Sort par createdTime (stable) — replace version Drive ne fait PAS remonter en Top.

import "server-only";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { unstable_cache } from "next/cache";
import { listAllVideos, type VideoFile } from "./drive";

export { THEMATIC_ROWS, ERAS, slugify, unslugify } from "./catalog-meta";

export interface Catalog {
  all: VideoFile[];
  byCategory: Map<string, VideoFile[]>;
  byId: Map<string, VideoFile>;
  recents: VideoFile[];
  hero: VideoFile | null;
}

interface CatalogSerialized {
  all: VideoFile[];
  recents: VideoFile[];
  hero: VideoFile | null;
}

// Charge le mapping Bunny une seule fois au démarrage
function loadBunnyMapping(): Map<string, { bunnyId: string; collectionId: string }> {
  const mappingPath = resolve(process.cwd(), "scripts/bunny-mapping.json");
  if (!existsSync(mappingPath)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(mappingPath, "utf8"));
    return new Map(Object.entries(raw).map(([driveId, v]: [string, any]) => [
      driveId,
      { bunnyId: v.bunnyId, collectionId: v.collectionId },
    ]));
  } catch {
    return new Map();
  }
}

const bunnyMapping = loadBunnyMapping();

// Tri "récent" basé sur createdTime (vraie date d'ajout initial).
// Fallback modifiedTime si createdTime absent (anciens fichiers).
function sortKey(v: VideoFile): string {
  return v.createdTime ?? v.modifiedTime ?? "";
}

const fetchCatalogRaw = unstable_cache(
  async (): Promise<CatalogSerialized> => {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID missing");

    const all = await listAllVideos(folderId);

    // Enrichir chaque vidéo avec son bunnyId
    for (const v of all) {
      const bunny = bunnyMapping.get(v.id);
      if (bunny) {
        v.bunnyId = bunny.bunnyId;
        v.collectionId = bunny.collectionId;
      }
    }

    const recents = [...all]
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
      .slice(0, 16);

    return { all, recents, hero: recents[0] ?? null };
  },
  ["catalog-v2-createdTime"],
  { revalidate: 3600, tags: ["catalog"] }
);

export async function getCatalog(): Promise<Catalog> {
  const raw = await fetchCatalogRaw();

  const byCategory = new Map<string, VideoFile[]>();
  const byId = new Map<string, VideoFile>();
  for (const v of raw.all) {
    const cat = v.category ?? "Divers";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(v);
    byId.set(v.id, v);
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  }

  return {
    all: raw.all,
    byCategory,
    byId,
    recents: raw.recents,
    hero: raw.hero,
  };
}