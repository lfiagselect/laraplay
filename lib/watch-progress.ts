// LARAPLAY — Tracking progress lecture (localStorage)
// Stockage par user (email). Sauvegarde toutes les 10s pendant lecture.
// Marque "vu" quand >= 90% du fichier.

export interface WatchEntry {
  videoId: string;
  position: number; // secondes
  duration: number; // secondes
  updatedAt: number; // timestamp ms
  completed: boolean;
}

const VERSION = "v1";
const MAX_ENTRIES = 50; // évite que localStorage explose

function key(userEmail: string): string {
  return `laraplay-watch-${VERSION}-${userEmail.toLowerCase()}`;
}

export function loadProgress(userEmail: string): WatchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(userEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveProgress(userEmail: string, entry: WatchEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadProgress(userEmail);
    const filtered = existing.filter((e) => e.videoId !== entry.videoId);
    const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);
    localStorage.setItem(key(userEmail), JSON.stringify(updated));
  } catch {
    // QuotaExceeded ou autre — ignore
  }
}

export function getEntry(userEmail: string, videoId: string): WatchEntry | null {
  return loadProgress(userEmail).find((e) => e.videoId === videoId) ?? null;
}

export function removeEntry(userEmail: string, videoId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadProgress(userEmail);
    const filtered = existing.filter((e) => e.videoId !== videoId);
    localStorage.setItem(key(userEmail), JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/** Liste pour affichage "Continuer à regarder" — exclut "completed" et "à peine commencé" */
export function getContinueWatching(userEmail: string): WatchEntry[] {
  return loadProgress(userEmail)
    .filter((e) => !e.completed && e.position > 30 && e.position < e.duration - 30)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
