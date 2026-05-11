// LARAPLAY — Player vidéo.
// Si bunnyId disponible → iframe embed Bunny (player natif CDN, qualité adaptative).
// Sinon → fallback proxy Drive via <video>.
// Track watch progress (localStorage par user) via postMessage Bunny.
// V9: hook useBunnyProgress mutualisé avec InfoModal.

"use client";

import { useEffect, useRef, useState } from "react";
import { getEntry, saveProgress } from "@/lib/watch-progress";
import { useBunnyProgress } from "@/lib/use-bunny-progress";

const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const BUNNY_PULL_ZONE = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE;

interface PlayerProps {
  poster?: string;
  videoId?: string;
  bunnyId?: string;
  userEmail?: string;
  className?: string;
  autoPlay?: boolean;
}

export function Player({
  poster,
  videoId,
  bunnyId,
  userEmail,
  className = "",
  autoPlay = true,
}: PlayerProps) {
  // ── Bunny embed iframe (avec watch-progress) ───────────────────────────────
  if (bunnyId && BUNNY_LIBRARY_ID) {
    return (
      <BunnyPlayer
        bunnyId={bunnyId}
        videoId={videoId}
        userEmail={userEmail}
        className={className}
        autoPlay={autoPlay}
      />
    );
  }

  // ── Fallback Drive proxy ───────────────────────────────────────────────────
  return (
    <DrivePlayer
      poster={poster}
      videoId={videoId}
      userEmail={userEmail}
      className={className}
      autoPlay={autoPlay}
    />
  );
}

// ── Bunny iframe player avec watch-progress via postMessage ──────────────────
function BunnyPlayer({
  bunnyId,
  videoId,
  userEmail,
  className = "",
  autoPlay = true,
}: {
  bunnyId: string;
  videoId?: string;
  userEmail?: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const autoPlayParam = autoPlay ? "1" : "0";
  const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyId}?autoplay=${autoPlayParam}&preload=true&responsive=true`;

  useBunnyProgress({
    iframeRef,
    videoId,
    userEmail,
    enabled: true,
    resume: true,
  });

  return (
    <div className={`relative bg-black ${className}`} style={{ paddingTop: "56.25%" }}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// ── Sous-composant Drive (logique watch-progress inchangée) ──────────────────
function DrivePlayer({
  poster,
  videoId,
  userEmail,
  className = "",
  autoPlay = true,
}: Omit<PlayerProps, "bunnyId">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoId) return;
    v.src = `/api/stream/${videoId}`;
    v.load();
  }, [videoId]);

  // Resume position
  useEffect(() => {
    if (!videoId || !userEmail) return;
    const entry = getEntry(userEmail, videoId);
    if (!entry) return;
    const v = videoRef.current;
    if (!v) return;
    let restored = false;
    const tryRestore = () => {
      if (restored || !isFinite(v.duration) || v.duration <= 0) return;
      v.currentTime = Math.max(0, Math.min(entry.position - 5, v.duration - 1));
      restored = true;
    };
    v.addEventListener("loadedmetadata", tryRestore);
    v.addEventListener("canplay", tryRestore);
    return () => {
      v.removeEventListener("loadedmetadata", tryRestore);
      v.removeEventListener("canplay", tryRestore);
    };
  }, [videoId, userEmail]);

  // Save progress
  useEffect(() => {
    if (!videoId || !userEmail) return;
    const v = videoRef.current;
    if (!v) return;
    let lastSave = 0;
    const persist = (force = false) => {
      if (!v.duration || !isFinite(v.duration)) return;
      const now = Date.now();
      if (!force && now - lastSave < 10_000) return;
      lastSave = now;
      saveProgress(userEmail, {
        videoId,
        position: v.currentTime,
        duration: v.duration,
        updatedAt: now,
        completed: v.currentTime >= v.duration * 0.9,
      });
    };
    const onTime = () => persist();
    const onPause = () => persist(true);
    const onEnded = () => persist(true);
    const onBefore = () => persist(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    window.addEventListener("beforeunload", onBefore);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", onBefore);
      persist(true);
    };
  }, [videoId, userEmail]);

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="auto"
        poster={poster}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onError={() => setError(true)}
        className="w-full h-full"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-6">
          <p className="text-red-400">Erreur de lecture. Réessaie.</p>
        </div>
      )}
    </div>
  );
}
