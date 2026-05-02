// LARAPLAY — Preload hooks pour stream vidéo.
// useHoverPreload: desktop hover → fetch HEAD partiel pour warmer Drive cache.
// useViewportPreload: mobile/scroll → IntersectionObserver, 1 stream actif max.
// Préfère HEAD/Range fetch silencieux à <link rel=preload> (compat browser variable).

"use client";

import { useEffect, useRef } from "react";

const HOVER_DEBOUNCE_MS = 200;
const PRELOADED = new Set<string>();
const ACTIVE_PRELOADS = new Set<string>();
const MAX_CONCURRENT = 1;

function shouldPreload(id: string): boolean {
  if (PRELOADED.has(id)) return false;
  if (ACTIVE_PRELOADS.size >= MAX_CONCURRENT) return false;
  return true;
}

async function warmStream(id: string, signal: AbortSignal): Promise<void> {
  if (!shouldPreload(id)) return;
  ACTIVE_PRELOADS.add(id);
  try {
    // Range bytes=0-65535 → 64KB. Suffit pour moov atom + warmup Drive auth/CDN.
    const res = await fetch(`/api/stream/${id}`, {
      headers: { Range: "bytes=0-65535" },
      signal,
    });
    // Drain et drop — on veut juste éveiller le pipe.
    if (res.body) {
      const reader = res.body.getReader();
      while (!signal.aborted) {
        const { done } = await reader.read();
        if (done) break;
      }
      reader.releaseLock?.();
    }
    PRELOADED.add(id);
  } catch {
    // abort ou network — silence
  } finally {
    ACTIVE_PRELOADS.delete(id);
  }
}

/**
 * Préchauffe stream au mouseenter (desktop).
 * Debounce 200ms pour éviter trigger sur survols passagers.
 */
export function useHoverPreload(id: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const onEnter = () => {
    if (timerRef.current) return;
    // Skip mobile (no hover capability)
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      void warmStream(id, ctrl.signal);
    }, HOVER_DEBOUNCE_MS);
  };

  const onLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Garde fetch en cours: si user revient ou clique, le warm est utile.
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ctrlRef.current?.abort();
    };
  }, []);

  return { onMouseEnter: onEnter, onMouseLeave: onLeave };
}

/**
 * Préchauffe stream quand card entre dans viewport (mobile/touch).
 * IntersectionObserver root par défaut, threshold 0.5 → card visible >50%.
 */
export function useViewportPreload(id: string) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (PRELOADED.has(id)) return;

    const ctrl = new AbortController();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            void warmStream(id, ctrl.signal);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      ctrl.abort();
    };
  }, [id]);

  return ref;
}
