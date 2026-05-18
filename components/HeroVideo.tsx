// LARAPLAY — Hero billboard avec vidéo background.
// V8: id="hero-video-el" pour pouvoir stopper depuis HeroResponsive au skip.

"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { HeroVideo } from "@/lib/hero-videos";

const BUNNY_PULL_ZONE = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE;

interface HeroVideoProps {
  hero: HeroVideo;
  onEnded?: () => void;
}

export function HeroVideoBlock({ hero, onEnded }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = BUNNY_PULL_ZONE && hero.bunnyId
    ? `https://${BUNNY_PULL_ZONE}/${hero.bunnyId}/play_720p.mp4`
    : undefined;
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (v.src !== videoSrc) v.src = videoSrc;
    v.load();
    v.play().catch(() => {});
  }, [videoSrc]);

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
    <section className="relative w-full overflow-hidden bg-black" style={{ minHeight: "56vw", maxHeight: "78vh" }}>
      <div className="absolute inset-0 animate-hero-zoom origin-center bg-black">
        {hero.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.poster}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <video
          id="hero-video-el"
          ref={videoRef}
          src={videoSrc}
          poster={hero.poster}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => onEnded?.()}
          onError={() => onEnded?.()}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0b0b] via-black/40 to-transparent pointer-events-none" />
      <button
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        className="absolute right-6 bottom-12 md:right-12 md:top-1/2 md:bottom-auto md:-translate-y-1/2 w-11 h-11 rounded-full border-2 border-white/40 bg-black/30 hover:border-white hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition z-20"
        aria-label={muted ? "Activer son" : "Couper son"}
      >
        {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
      </button>
    </section>
  );
}
