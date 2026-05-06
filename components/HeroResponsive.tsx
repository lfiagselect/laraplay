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
  heroSrc: string; // URL signée pré-résolue server-side
  carouselSlides: HeroCarouselSlideConfig[];
}

export function HeroResponsive({ hero, heroSrc, carouselSlides }: HeroResponsiveProps) {
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

  if (isMobile === null) {
    return <HeroCarousel slides={carouselSlides} />;
  }

  if (isMobile) {
    return <HeroCarousel slides={carouselSlides} />;
  }

  return (
    <div className="relative">
      <div
        className={`transition-opacity duration-700 ${
          videoEnded ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
        }`}
      >
        <HeroVideoBlock hero={hero} src={heroSrc} onEnded={() => setVideoEnded(true)} />
      </div>

      {videoEnded && (
        <div className="animate-hero-fade-up">
          <HeroCarousel slides={carouselSlides} />
        </div>
      )}
    </div>
  );
}
