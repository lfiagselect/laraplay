// LARAPLAY — Player vidéo avec loader/spinner pendant buffering.
// Track watch progress (localStorage par user).

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getEntry, saveProgress } from "@/lib/watch-progress";

interface PlayerProps {
  src: string;
  videoId?: string;
  userEmail?: string;
  className?: string;
  autoPlay?: boolean;
}

export function Player({
  src,
  videoId,
  userEmail,
  className = "",
  autoPlay = true,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resume position au load si entry existe
  useEffect(() => {
    if (!videoId || !userEmail) return;
    const entry = getEntry(userEmail, videoId);
    if (!entry) return;
    const v = videoRef.current;
    if (!v) return;

    let restored = false;
    const tryRestore = () => {
      if (restored) return;
      try {
        if (!isFinite(v.duration) || v.duration <= 0) return;
        v.currentTime = Math.max(0, Math.min(entry.position - 5, v.duration - 1));
        restored = true;
      } catch {
        // seek hors range / stream pas prêt — réessaye sur prochain event
      }
    };

    v.addEventListener("loadedmetadata", tryRestore);
    v.addEventListener("canplay", tryRestore);
    return () => {
      v.removeEventListener("loadedmetadata", tryRestore);
      v.removeEventListener("canplay", tryRestore);
    };
  }, [videoId, userEmail]);

  // Save progress toutes les 10s + à pause
  useEffect(() => {
    if (!videoId || !userEmail) return;
    const v = videoRef.current;
    if (!v) return;

    let lastSave = 0;
    const SAVE_INTERVAL_MS = 10_000;

    const persist = (force = false) => {
      if (!v.duration || !isFinite(v.duration)) return;
      const now = Date.now();
      if (!force && now - lastSave < SAVE_INTERVAL_MS) return;
      lastSave = now;

      const completed = v.currentTime >= v.duration * 0.9;
      saveProgress(userEmail, {
        videoId,
        position: v.currentTime,
        duration: v.duration,
        updatedAt: now,
        completed,
      });
    };

    const onTime = () => persist();
    const onPause = () => persist(true);
    const onEnded = () => persist(true);
    const onBeforeUnload = () => persist(true);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", onBeforeUnload);
      persist(true);
    };
  }, [videoId, userEmail]);

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
