// LARAPLAY — Provider modal "Plus d'infos"
// Permet d'ouvrir le modal depuis n'importe quelle card sans prop drilling.

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { VideoFile } from "@/lib/drive";
import { InfoModal } from "./InfoModal";

interface ModalContextValue {
  open: (videoId: string) => void;
  close: () => void;
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

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [state, setState] = useState<State>({
    loading: false,
    video: null,
    related: [],
    error: null,
  });

  const open = useCallback((videoId: string) => setOpenId(videoId), []);
  const close = useCallback(() => {
    setOpenId(null);
    setState({ loading: false, video: null, related: [], error: null });
  }, []);

  // Fetch quand openId change
  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    setState({ loading: true, video: null, related: [], error: null });

    fetch(`/api/video/${openId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          video: data.video,
          related: data.related ?? [],
          error: null,
        });
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
    <ModalContext.Provider value={{ open, close }}>
      {children}
      {openId && state.video && (
        <InfoModal
          video={state.video}
          related={state.related}
          onClose={close}
        />
      )}
      {openId && state.loading && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {openId && state.error && (
        <div
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center"
          onClick={close}
        >
          <div className="bg-zinc-900 rounded-lg p-6 text-white">
            <p className="mb-3">Impossible de charger les infos.</p>
            <button
              onClick={close}
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
