// LARAPLAY — Hero responsive
// Mobile : carousel direct.
// Desktop : vidéo immersive, fade-cross vers carousel quand vidéo terminée.

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
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // SSR / 1er render : carousel par défaut (léger, pas de gros download mobile)
  if (isMobile === null) {
    return <HeroCarousel slides={carouselSlides} />;
  }

  // Mobile : carousel direct
  if (isMobile) {
    return <HeroCarousel slides={carouselSlides} />;
  }

  // Desktop : vidéo + carousel empilés, fade-cross via opacity à la fin de la vidéo
  return (
    <div className="relative">
      {/* Vidéo : reste montée tant que pas finie pour permettre le fade */}
      <div
        className={`transition-opacity duration-700 ${
          videoEnded ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
        }`}
      >
        <HeroVideoBlock hero={hero} onEnded={() => setVideoEnded(true)} />
      </div>

      {/* Carousel : caché jusqu'à fin vidéo, puis fade-in */}
      {videoEnded && (
        <div className="animate-hero-fade-up">
          <HeroCarousel slides={carouselSlides} />
        </div>
      )}
    </div>
  );
}
