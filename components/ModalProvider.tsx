// LARAPLAY — Provider modal "Plus d'infos"
// Permet d'ouvrir le modal depuis n'importe quelle card sans prop drilling.
// V2: prefetch /api/video au hover → cache Map en mémoire → modal instantané.

"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { VideoFile } from "@/lib/video-types";
import { InfoModal } from "./InfoModal";

interface ModalContextValue {
  open: (videoId: string) => void;
  close: () => void;
  preload: (videoId: string) => void;
  userEmail: string | null;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useVideoModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useVideoModal must be used inside ModalProvider");
  return ctx;
}

interface State {
  loading: boolean;
  video: VideoFile | null;
  related: VideoFile[];
  error: string | null;
}

const EMPTY_STATE: State = { loading: false, video: null, related: [], error: null };

export function ModalProvider({
  children,
  userEmail = null,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [state, setState] = useState<State>(EMPTY_STATE);
  const cache = useRef<Map<string, State>>(new Map());
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  // Prefetch au hover — fire & forget, résultat mis en cache
  const preload = useCallback((videoId: string) => {
    if (cache.current.has(videoId)) return;
    // Marquer comme en cours pour éviter doubles requêtes
    cache.current.set(videoId, { loading: true, video: null, related: [], error: null });
    fetch(`/api/video/${videoId}`)
      .then((r) => r.json())
      .then((data) => {
        cache.current.set(videoId, {
          loading: false,
          video: data.video,
          related: data.related ?? [],
          error: null,
        });
      })
      .catch(() => {
        // En cas d'erreur réseau : supprimer du cache pour permettre retry au clic
        cache.current.delete(videoId);
      });
  }, []);

  const open = useCallback((videoId: string) => {
    const cached = cache.current.get(videoId);
    // Si données déjà en cache et complètes → affichage instantané
    if (cached?.video) {
      setState(cached);
    }
    setOpenId(videoId);
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    setState(EMPTY_STATE);
  }, []);

  // Le provider est dans le layout racine : sans ce garde-fou, une modale ouverte
  // peut rester au-dessus de la page /watch après une navigation client.
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    close();
  }, [pathname, close]);

  // Fetch normal au clic — fallback si prefetch pas encore arrivé
  useEffect(() => {
    if (!openId) return;
    // Si déjà chargé via cache → pas de fetch supplémentaire
    const cached = cache.current.get(openId);
    if (cached?.video) return;

    let cancelled = false;
    setState({ loading: true, video: null, related: [], error: null });

    fetch(`/api/video/${openId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const next: State = {
          loading: false,
          video: data.video,
          related: data.related ?? [],
          error: null,
        };
        cache.current.set(openId, next);
        setState(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          loading: false,
          video: null,
          related: [],
          error: err instanceof Error ? err.message : "Erreur",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [openId]);

  return (
    <ModalContext.Provider value={{ open, close, preload, userEmail }}>
      {children}
      {openId && state.video && (
        <InfoModal
          video={state.video}
          related={state.related}
          userEmail={userEmail}
          onClose={close}
        />
      )}
      {openId && state.loading && (
        // MODAL-01: overlay trapé et fermable (Return → data-tv-close).
        <div
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center"
          data-tv-trap="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Chargement"
        >
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <button data-tv-close onClick={close} className="sr-only" aria-label="Fermer">
            Fermer
          </button>
        </div>
      )}
      {openId && state.error && (
        <div
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center"
          onClick={close}
          data-tv-trap="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Erreur"
        >
          <div className="bg-zinc-900 rounded-lg p-6 text-white" data-tv-section="modal-error">
            <p className="mb-3">Impossible de charger les infos.</p>
            <button
              onClick={close}
              data-tv-close
              data-focusable
              autoFocus
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
