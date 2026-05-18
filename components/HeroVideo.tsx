// LARAPLAY — Hero billboard Netflix-like
// Vidéo full-bleed background, gradient bas+gauche, texte bottom-left, header overlap.
// V8: id="hero-video-el" pour pouvoir stopper depuis HeroResponsive au skip.

"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Info } from "lucide-react";
import type { HeroVideo } from "@/lib/hero-videos";

const BUNNY_PULL_ZONE = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE;

interface HeroVideoProps {
  hero: HeroVideo;
  onEnded?: () => void;
  /** Index dans billboard pour stop audio cross-talk. Optionnel. */
  billboardIndex?: number;
  /** Si false, video pause + mute (cycle billboard inactive). Défaut true. */
  active?: boolean;
}

export function HeroVideoBlock({ hero, onEnded, billboardIndex, active = true }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = BUNNY_PULL_ZONE && hero.bunnyId
    ? `https://${BUNNY_PULL_ZONE}/${hero.bunnyId}/play_720p.mp4`
    : undefined;
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    // Ne charge la vidéo QUE quand active (économise réseau, évite onError fantôme
    // sur slots inactifs au mount initial du billboard).
    if (!active) return;
    if (v.src !== videoSrc) v.src = videoSrc;
    v.load();
    v.play().catch(() => {});
  }, [videoSrc, active]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!active) {
      try { v.pause(); v.muted = true; } catch {}
      return;
    }
    v.muted = muted;
    if (!muted) v.play().catch(() => setMuted(true));
    if (muted && v.paused) v.play().catch(() => {});
  }, [muted, active]);

  useEffect(() => {
    const activate = () => setMuted(false);
    const opts = { once: true } as const;
    window.addEventListener("click", activate, opts);
    window.addEventListener("keydown", activate, opts);
    window.addEventListener("touchstart", activate, opts);
    return () => {
      window.removeEventListener("click", activate);
      window.removeEventListener("keydown", activate);
      window.removeEventListener("touchstart", activate);
    };
  }, []);

  return (
    <section
      className="hero-section relative w-full overflow-hidden bg-black"
    >
      {/* Video / poster pleine bleed */}
      <div className="absolute inset-0 bg-black">
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
          id={billboardIndex === undefined ? "hero-video-el" : `hero-video-el-${billboardIndex}`}
          ref={videoRef}
          src={active ? videoSrc : undefined}
          poster={hero.poster}
          autoPlay={active}
          muted
          playsInline
          preload={active ? "auto" : "none"}
          data-hero-billboard={billboardIndex !== undefined ? "1" : undefined}
          data-hero-idx={billboardIndex}
          onEnded={() => onEnded?.()}
          // onError NE déclenche PAS onEnded en mode billboard (sinon cycle bloqué
          // par cascade fail sur slots inactifs). Cycle natural 25s prend le relais.
          onError={() => { if (billboardIndex === undefined) onEnded?.(); }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Gradient gauche (lisibilité texte) */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full md:w-2/3 pointer-events-none"
        style={{
          background: "linear-gradient(77deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.15) 60%, transparent 85%)",
        }}
      />

      {/* Gradient bas (fondu rows) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 50%, #0b0b0b 100%)",
        }}
      />

      {/* Contenu texte + CTA — Netflix bottom-left */}
      <div className="absolute inset-0 flex items-end pb-[18%] md:pb-[10%] z-10">
        <div className="px-4 md:px-12 lg:px-14 max-w-[640px] md:max-w-[42%] w-full">
          {hero.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.logo}
              alt={hero.title}
              className="block mb-3 md:mb-4 w-auto h-20 sm:h-24 md:h-32 lg:h-40 max-w-[80%] md:max-w-[420px] drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]"
            />
          ) : (
            <>
              {hero.tag && (
                <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-red-500 font-bold mb-3">
                  {hero.tag}
                </p>
              )}
              <h1 className="hero-title font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-[0.95] mb-3 md:mb-4"
                style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}
              >
                {hero.title}
              </h1>
            </>
          )}
          {hero.subtitle && (
            <p className="text-white/90 text-sm md:text-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mb-4 md:mb-6 max-w-xl">
              {hero.subtitle}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <a
              href={hero.ctaLecture}
              data-focusable
              className="inline-flex items-center gap-2 bg-white text-black font-bold rounded-md px-5 md:px-8 py-2 md:py-2.5 text-sm md:text-base hover:bg-white/85 transition"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
              Lecture
            </a>
            {hero.ctaInfoVideoId && (
              <a
                href={`/watch/${hero.ctaInfoVideoId}`}
                data-focusable
                className="inline-flex items-center gap-2 bg-zinc-500/60 text-white font-bold rounded-md px-5 md:px-8 py-2 md:py-2.5 text-sm md:text-base hover:bg-zinc-500/80 backdrop-blur-sm transition"
              >
                <Info className="w-4 h-4 md:w-5 md:h-5" />
                Plus d&apos;infos
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bouton son + badge âge — coin droit bas, alignés Netflix */}
      <div className="absolute right-0 bottom-[22%] md:bottom-[16%] z-20 flex items-center gap-3 md:gap-4 pr-2 md:pr-0">
        <button
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
          className="w-9 h-9 md:w-11 md:h-11 rounded-full border-2 border-white/40 bg-black/40 hover:border-white hover:bg-black/60 flex items-center justify-center transition"
          aria-label={muted ? "Activer son" : "Couper son"}
        >
          {muted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />}
        </button>
        <div className="bg-zinc-500/40 border-l-4 border-zinc-300 text-white text-xs md:text-base font-medium px-2 md:px-3 py-0.5 md:py-1 backdrop-blur-sm">
          13+
        </div>
      </div>
    </section>
  );
}
