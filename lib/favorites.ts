// LARAPLAY — Favoris (Ma liste) — localStorage par user
// Stocke array d'IDs vidéos. Pas de limite stricte mais soft cap à 500.

const VERSION = "v1";
const SOFT_CAP = 500;

function key(userEmail: string): string {
  return `laraplay-favs-${VERSION}-${userEmail.toLowerCase()}`;
}

export function loadFavorites(userEmail: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(userEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function isFavorite(userEmail: string, videoId: string): boolean {
  return loadFavorites(userEmail).includes(videoId);
}

export function toggleFavorite(userEmail: string, videoId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = loadFavorites(userEmail);
    let next: string[];
    if (current.includes(videoId)) {
      next = current.filter((id) => id !== videoId);
    } else {
      next = [videoId, ...current].slice(0, SOFT_CAP);
    }
    localStorage.setItem(key(userEmail), JSON.stringify(next));
    return next.includes(videoId);
  } catch {
    return false;
  }
}
