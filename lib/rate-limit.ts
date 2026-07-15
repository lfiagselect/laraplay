// LARAPLAY — Rate limiter en mémoire (fenêtre glissante simple).
// Suffisant en single-instance (VPS OVH, service systemd unique).

const buckets = new Map<string, number[]>();

const MAX_KEYS = 5_000;

/**
 * true si l'appel est autorisé, false si la limite est atteinte.
 * key: identifiant (ip + route), limit: nb max d'appels, windowMs: fenêtre.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let hits = buckets.get(key);
  if (!hits) {
    hits = [];
    buckets.set(key, hits);
  }
  // Nettoyage fenêtre
  while (hits.length > 0 && now - hits[0] > windowMs) hits.shift();
  if (hits.length >= limit) return false;
  hits.push(now);

  // Garde-fou mémoire
  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return true;
}

/** IP client best-effort derrière Caddy. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
