// LARAPLAY — Helpers de formatage partagés

export function formatDuration(ms?: string): string | null {
  if (!ms) return null;
  const total = Math.floor(Number(ms) / 1000);
  if (!total) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function formatSize(size?: string): string | null {
  if (!size) return null;
  const n = Number(size);
  if (!n) return null;
  if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Go`;
  return `${(n / 1_000_000).toFixed(0)} Mo`;
}
