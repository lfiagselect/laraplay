// LARAPLAY — Hero billboard Netflix-style
// Cycle 3 heroes (1 fixé + 2 random catalog) toutes les 25s avec crossfade 1s.
// Premium transitions: opacity + scale subtle. Indicateurs barres bas.
// Fallback carousel images si toutes les videos hero échouent.

"use client";

import { useEffect, useRef, useState } from "react";
import { HeroVideoBlock } from "./HeroVideo";
import { HeroCarousel } from "./HeroCarousel";
import type { HeroVideo, HeroCarouselSlideConfig } from "@/lib/hero-videos";

const CYCLE_MS = 25_000;
const CROSSFADE_MS = 1_000;

interface HeroBillboardProps {
  heroes: HeroVideo[];
  carouselSlides: HeroCarouselSlideConfig[];
}

export function HeroBillboard({ heroes, carouselSlides }: HeroBillboardProps) {
  const [index, setIndex] = useState(0);
  const [allEnded, setAllEnded] = useState(false);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filtre heroes valides (bunnyId présent)
  const validHeroes = heroes.filter((h) => h.bunnyId);
  const total = validHeroes.length;

  // Cycle automatique 25s
  useEffect(() => {
    if (total <= 1 || allEnded) return;
    cycleTimer.current = setTimeout(() => {
      setIndex((i) => (i + 1) % total);
    }, CYCLE_MS);
    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [index, total, allEnded]);

  // Stop son video précédente avant crossfade
  useEffect(() => {
    // Tue toute video précédente non-active (audio fantôme)
    const videos = document.querySelectorAll<HTMLVideoElement>("video[data-hero-billboard]");
    videos.forEach((v) => {
      const idx = Number(v.dataset.heroIdx ?? "-1");
      if (idx !== index) {
        try {
          v.pause();
          v.muted = true;
        } catch {}
      }
    });
  }, [index]);

  function handleSkip() {
    // Stop toutes vidéos hero
    const videos = document.querySelectorAll<HTMLVideoElement>("video[data-hero-billboard]");
    videos.forEach((v) => {
      try {
        v.pause();
        v.muted = true;
        v.src = "";
      } catch {}
    });
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
    setAllEnded(true);
  }

  if (total === 0) {
    return (
      <div data-tv-section="hero" className="relative">
        <HeroCarousel slides={carouselSlides} />
      </div>
    );
  }

  return (
    <div data-tv-section="hero" className="relative">
      {/* Stack des hero videos en absolu, crossfade opacity */}
      <div className={`relative transition-opacity ${allEnded ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"}`}
        style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
      >
        {validHeroes.map((hero, i) => (
          <div
            key={`${hero.id}-${i}`}
            className="absolute inset-0 transition-opacity"
            style={{
              opacity: i === index ? 1 : 0,
              zIndex: i === index ? 2 : 1,
              transitionDuration: `${CROSSFADE_MS}ms`,
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            <HeroVideoBlock
              hero={hero}
              billboardIndex={i}
              active={i === index && !allEnded}
              onEnded={() => {
                // Vidéo finie avant 25s → passe à la suivante immédiatement
                if (i === index) setIndex((cur) => (cur + 1) % total);
              }}
            />
          </div>
        ))}

        {/* Spacer pour donner hauteur au container relatif */}
        <div className="hero-section invisible" aria-hidden="true" />

        {/* Indicateurs Netflix bottom — barres horizontales */}
        {total > 1 && (
          <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 md:gap-2">
            {validHeroes.map((_, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                aria-label={`Hero ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-[3px] md:h-1 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 md:w-12 bg-white"
                    : "w-4 md:w-6 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}

        {/* Bouton Passer (skip vers carousel fallback) */}
        <button
          data-focusable
          onClick={handleSkip}
          className="absolute right-3 md:right-12 top-[calc(env(safe-area-inset-top,0px)+64px)] md:top-auto md:bottom-14 z-30 flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-black/60 border border-white/30 hover:bg-black/80 hover:border-white/60 focus:bg-black/80 focus:border-white focus:outline focus:outline-2 focus:outline-white backdrop-blur-sm text-white text-xs md:text-sm font-medium transition"
          aria-label="Passer l'intro"
        >
          <span>Passer</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      {/* Carousel fallback après skip global */}
      {allEnded && (
        <div className="animate-hero-fade-up">
          <HeroCarousel slides={carouselSlides} />
        </div>
      )}
    </div>
  );
}
