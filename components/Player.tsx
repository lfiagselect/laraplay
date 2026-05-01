// LARAPLAY — Player vidéo. Track watch progress (localStorage par user).

"use client";

import { useEffect, useRef, useState } from "react";
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

  // Erreur lecture seulement
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onError = () => setError("Erreur de lecture. Recharge la page.");
    v.addEventListener("error", onError);
    return () => v.removeEventListener("error", onError);
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

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-6">
          <div>
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
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
