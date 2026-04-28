// LARAPLAY — Player vidéo avec loader/spinner pendant buffering.
// Wrapper autour de <video> HTML5 natif. Détecte états chargement.

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface PlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
}

export function Player({ src, className = "", autoPlay = true }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadStart = () => setLoading(true);
    const onWaiting = () => setLoading(true);
    const onStalled = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      setLoading(false);
      setError("Erreur de lecture. Recharge la page.");
    };

    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
    };
  }, []);

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        playsInline
        className="w-full h-full"
        src={src}
      />

      {loading && !error && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            <p className="text-sm text-zinc-300">Chargement…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-6">
          <div>
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                videoRef.current?.load();
              }}
              className="text-sm text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
