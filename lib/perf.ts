// LARAPLAY — Perf marks client (KPI streaming)
// Measure: TTFB stream, canplay latency, playing latency.
// Flush vers /api/log via sendBeacon (survit unload).

"use client";

export interface PerfEvent {
  type: string; // ex: "stream.start", "player.canplay"
  videoId?: string;
  ms: number; // delta depuis t0 ou ref
  meta?: Record<string, string | number | boolean>;
  ts: number; // Date.now() à l'event
}

const QUEUE: PerfEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH = 20;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, MAX_BATCH);
  const body = JSON.stringify({ events: batch });

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/log", blob);
      return;
    }
  } catch {
    // fallback
  }
  // Fallback fetch keep-alive
  void fetch("/api/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function track(event: Omit<PerfEvent, "ts">) {
  if (typeof window === "undefined") return;
  QUEUE.push({ ...event, ts: Date.now() });
  if (QUEUE.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
}

// Flush sur unload pour pas perdre derniers events
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}

/** Helper timer: retourne fn qui mark delta au moment appel */
export function startTimer() {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return () => {
    const t1 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return Math.round(t1 - t0);
  };
}
