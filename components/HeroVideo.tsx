// LARAPLAY — Hero billboard avec vidéo background.
// V4: src optionnel — si passé (server-side) = démarrage immédiat.
//     sinon fallback fetch /api/stream/[driveId] (client-side).

"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { HeroVideo } from "@/lib/hero-videos";

interface HeroVideoProps {
  hero: HeroVideo;
  src?: string; // URL signée pré-résolue server-side (optionnelle)
  onEnded?: () => void;
}

export function HeroVideoBlock({ hero, src, onEnded }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (src) {
      // URL pré-résolue server-side — démarrage immédiat
      v.src = src;
      v.load();
      v.play().catch(() => {});
    } else if (hero.driveId) {
      // Fallback: fetch client
      fetch(`/api/stream/${hero.driveId}`)
        .then((r) => r.json())
        .then(({ url }) => {
          if (!v || !url) return;
          v.src = url;
          v.load();
          v.play().catch(() => {});
        })
        .catch(console.error);
    }
  }, [src, hero.driveId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (!muted) v.play().catch(() => setMuted(true));
  }, [muted]);

  useEffect(() => {
    const activate = () => setMuted(false);
    const opts = { once: true } as const;
    window.addEventListener("click", activate, opts);
    window.addEventListener("keydown", activate, opts);
    window.addEventListener("scroll", activate, opts);
    window.addEventListener("touchstart", activate, opts);
    return () => {
      window.removeEventListener("click", activate);
      window.removeEventListener("keydown", activate);
      window.removeEventListener("scroll", activate);
      window.removeEventListener("touchstart", activate);
    };
  }, []);

  return (
    <section className="relative w-full overflow-hidden aspect-video max-h-[78vh] min-h-[420px] bg-black">
      <div className="absolute inset-0 animate-hero-zoom origin-center bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => onEnded?.()}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0b0b] via-black/40 to-transparent pointer-events-none" />
      <button
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        className="absolute right-6 md:right-12 bottom-12 md:top-1/2 md:bottom-auto md:-translate-y-1/2 w-11 h-11 rounded-full border-2 border-white/40 bg-black/30 hover:border-white hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition z-20"
        aria-label={muted ? "Activer son" : "Couper son"}
      >
        {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
      </button>
    </section>
  );
}
