// LARAPLAY — Hero billboard selector
// Garde leffetlara fixé en hero[0], pioche 2 random dans catalog Bunny pour hero[1] et hero[2].
// Server-only: appelé depuis page.tsx au rendering. Pas de cache (random à chaque request).

import "server-only";
import type { VideoFile } from "./bunny";
import type { HeroVideo } from "./hero-videos";
import { HERO_VIDEOS } from "./hero-videos";

/** Convertit VideoFile catalogue Bunny → HeroVideo (sans logo, just title+meta) */
function videoToHero(v: VideoFile): HeroVideo {
  const cleanName = v.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
  return {
    id: v.id,
    bunnyId: v.bunnyId,
    poster: v.bunnyThumbnail,
    title: cleanName,
    tag: v.category,
    // Pas de ctaLecture direct: bouton Plus d'infos via ctaInfoVideoId
    ctaLecture: `/watch/${v.id}`,
    ctaInfoVideoId: v.id,
  };
}

/**
 * Pioche 2 videos random dans catalog.all (exclut bunnyId déjà en hero fixe).
 * Filtre videos ayant bunnyId valide + thumbnail (sinon hero vide).
 */
function pickRandom(all: VideoFile[], count: number, exclude: Set<string>): VideoFile[] {
  const pool = all.filter(
    (v) =>
      v.bunnyId &&
      v.bunnyThumbnail &&
      !exclude.has(v.bunnyId)
  );
  if (pool.length <= count) return pool;

  // Fisher-Yates partial shuffle
  const result: VideoFile[] = [];
  const indices = pool.map((_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (indices.length - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
    result.push(pool[indices[i]]);
  }
  return result;
}

/**
 * Construit liste de 3 heroes:
 *   [0] = HERO_VIDEOS[0] (leffetlara fixé)
 *   [1], [2] = random catalog
 */
export function pickHeroBillboard(catalogAll: VideoFile[]): HeroVideo[] {
  const fixed = HERO_VIDEOS[0];
  if (!fixed) return [];

  const exclude = new Set<string>([fixed.bunnyId]);
  const randoms = pickRandom(catalogAll, 2, exclude);

  return [fixed, ...randoms.map(videoToHero)];
}
