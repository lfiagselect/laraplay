// LARAPLAY — Hero responsive
// Mobile + Desktop : vidéo immersive Bunny, fade-cross vers carousel quand terminée.
// Bouton "Passer" disponible sur toutes les résolutions.

"use client";

import { useEffect, useState } from "react";
import { HeroVideoBlock } from "./HeroVideo";
import { HeroCarousel } from "./HeroCarousel";
import type { HeroVideo, HeroCarouselSlideConfig } from "@/lib/hero-videos";

interface HeroResponsiveProps {
  hero: HeroVideo;
  carouselSlides: HeroCarouselSlideConfig[];
}

export function HeroResponsive({ hero, carouselSlides }: HeroResponsiveProps) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const showCarousel = videoEnded || skipped;

  return (
    <div className="relative">
      {/* Vidéo hero — visible tant que non terminée/passée */}
      <div
        className={`transition-opacity duration-700 ${
          showCarousel ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
        }`}
      >
        <HeroVideoBlock hero={hero} onEnded={() => setVideoEnded(true)} />

        {/* Bouton Passer */}
        {!showCarousel && (
          <button
            onClick={() => setSkipped(true)}
            className="absolute right-6 bottom-24 md:right-12 md:bottom-14 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-white/30 hover:bg-black/70 hover:border-white/60 backdrop-blur-sm text-white text-sm font-medium transition"
            aria-label="Passer l'intro"
          >
            <span>Passer</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        )}
      </div>

      {/* Carousel — apparaît après fin ou skip */}
      {showCarousel && (
        <div className="animate-hero-fade-up">
          <HeroCarousel slides={carouselSlides} />
        </div>
      )}
    </div>
  );
}
