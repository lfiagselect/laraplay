// LARAPLAY — Hero responsive
// Mobile + Desktop : vidéo immersive Bunny, fade-cross vers carousel quand terminée.
// Bouton "Passer" : arrête la vidéo + son avant d'afficher le carousel.

"use client";

import { useEffect, useRef, useState } from "react";
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
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const showCarousel = videoEnded || skipped;

  // Expose une ref vers l'élément video natif pour pouvoir le stopper au skip
  useEffect(() => {
    videoElRef.current = document.querySelector("#hero-video-el");
  }, []);

  function handleSkip() {
    // Arrête la vidéo et coupe le son immédiatement
    const v = videoElRef.current ?? document.querySelector<HTMLVideoElement>("#hero-video-el");
    if (v) {
      v.pause();
      v.muted = true;
      v.src = "";
    }
    setSkipped(true);
  }

  return (
    <div data-tv-section="hero" className="relative">
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
            data-focusable
            onClick={handleSkip}
            onFocus={(e) => {
              // Sur TV: empêche tout scroll vertical accidentel lors focus initial sur ce bouton
              if (typeof document !== "undefined" && document.documentElement.classList.contains("tv")) {
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }
            }}
            className="absolute right-3 top-[max(env(safe-area-inset-top,0px),12px)] md:top-auto md:right-12 md:bottom-14 z-30 flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-black/50 border border-white/30 hover:bg-black/70 hover:border-white/60 focus:bg-black/80 focus:border-white focus:outline focus:outline-2 focus:outline-white backdrop-blur-sm text-white text-xs md:text-sm font-medium transition"
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
