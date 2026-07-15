// LARAPLAY — Helpers de formatage partagés

export function formatDuration(ms?: string): string | null {
  const total = Math.floor(Number(ms) / 1000);
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total < 60) return `${total} s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatSize(size?: string): string | null {
  if (!size) return null;
  const n = Number(size);
  if (!n) return null;
  if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Go`;
  return `${(n / 1_000_000).toFixed(0)} Mo`;
}
