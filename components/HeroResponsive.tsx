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
  /** Détection serveur : évite de monter brièvement la vidéo et son logo sur TV. */
  tvMode?: boolean;
}

export function HeroResponsive({ hero, carouselSlides, tvMode = false }: HeroResponsiveProps) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [carouselPreferred, setCarouselPreferred] = useState(tvMode);
  const [runtimeTV, setRuntimeTV] = useState(tvMode);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const showCarousel = carouselPreferred || videoEnded || skipped;

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const isTV = document.documentElement.classList.contains("tv");
    const shouldUseCarousel = narrow || tvMode || isTV || prefersReducedMotion || connection?.saveData === true;
    setRuntimeTV(tvMode || isTV);
    setCarouselPreferred(shouldUseCarousel);
    setPreviewEnabled(!shouldUseCarousel);
  }, [tvMode]);

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
      {/* Démonter le hero inactif évite deux jeux de CTA focusables/annoncés. */}
      {!showCarousel && (
        <div>
          <HeroVideoBlock
            hero={hero}
            enableVideo={previewEnabled}
            onEnded={() => setVideoEnded(true)}
          />

          {previewEnabled && (
            <button
              data-focusable
              onClick={handleSkip}
              className="absolute right-3 md:right-12 top-[calc(env(safe-area-inset-top,0px)+64px)] md:top-auto md:bottom-14 z-30 flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-black/60 border border-white/30 hover:bg-black/80 hover:border-white/60 focus:bg-black/80 focus:border-white focus:outline focus:outline-2 focus:outline-white backdrop-blur-sm text-white text-xs md:text-sm font-medium transition"
              aria-label="Passer l'intro"
            >
              <span>Passer</span>
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Carousel — apparaît après fin ou skip */}
      {showCarousel && (
        <div className="animate-hero-fade-up">
          <HeroCarousel slides={carouselSlides} tvMode={runtimeTV} />
        </div>
      )}
    </div>
  );
}
