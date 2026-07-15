// LARAPLAY — Player vidéo (VIDEO-01: Bunny uniquement).
// iframe embed Bunny (player natif CDN, qualité adaptative).
// Track watch progress (localStorage par user) via postMessage Bunny.
// Variable Bunny manquante → erreur de configuration explicite (jamais Drive).

"use client";

import { useRef } from "react";
import { useBunnyProgress } from "@/lib/use-bunny-progress";

const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;

interface PlayerProps {
  poster?: string;
  videoId?: string;
  bunnyId?: string;
  userEmail?: string;
  className?: string;
  autoPlay?: boolean;
}

export function Player({
  videoId,
  bunnyId,
  userEmail,
  className = "",
  autoPlay = true,
}: PlayerProps) {
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

  return (
    <div className={`relative bg-black flex items-center justify-center text-center p-6 ${className}`}>
      <p className="text-red-400">
        Configuration vidéo manquante (Bunny). Contactez l’administrateur.
      </p>
    </div>
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
