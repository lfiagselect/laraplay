// LARAPLAY — Preload hooks pour stream vidéo.
// useHoverPreload: desktop hover → fetch URL signée puis Range partiel Drive.
// useViewportPreload: mobile/scroll → IntersectionObserver, 1 stream actif max.
// I5: TV bypass useViewportPreload (D-pad cycle naturel, évite saturer pipe Drive).
// V2: warmStream résout d'abord l'URL via /api/stream/[id] (JSON) puis Range Drive direct.

"use client";

import { useEffect, useRef } from "react";

const HOVER_DEBOUNCE_MS = 200;
const PRELOADED = new Set<string>();
const ACTIVE_PRELOADS = new Set<string>();
const MAX_CONCURRENT = 1;

function isTVRuntime(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("tv");
}

function shouldPreload(id: string): boolean {
  if (PRELOADED.has(id)) return false;
  if (ACTIVE_PRELOADS.size >= MAX_CONCURRENT) return false;
  return true;
}

async function warmStream(id: string, signal: AbortSignal): Promise<void> {
  if (!shouldPreload(id)) return;
  ACTIVE_PRELOADS.add(id);
  try {
    // Étape 1 : récupérer l'URL signée (auth vérifiée côté serveur)
    const jsonRes = await fetch(`/api/stream/${id}`, { signal });
    if (!jsonRes.ok || signal.aborted) return;
    const { url } = await jsonRes.json();

    // Étape 2 : Range request sur Drive directement — zéro bandwidth Render
    const rangeRes = await fetch(url, {
      headers: { Range: "bytes=0-65535" },
      signal,
    });
    if (rangeRes.body) {
      const reader = rangeRes.body.getReader();
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
 * TV: no-op (pas de hover).
 */
export function useHoverPreload(id: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const onEnter = () => {
    if (timerRef.current) return;
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
 * I5: TV skip — D-pad cycle naturel + HoverPreload sur focus suffit.
 */
export function useViewportPreload(id: string) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (PRELOADED.has(id)) return;
    if (isTVRuntime()) return;

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