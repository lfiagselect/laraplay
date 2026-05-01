// LARAPLAY — Hero responsive
// Desktop: vidéo background HeroVideoBlock. Mobile: carrousel images.
// Détection client-side via media query (évite SSR mismatch).

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

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Pendant SSR / 1er render → carrousel par défaut (plus léger).
  // Évite charger 56 MB vidéo si user mobile.
  if (isMobile === null) {
    return <HeroCarousel slides={carouselSlides} />;
  }

  return isMobile ? (
    <HeroCarousel slides={carouselSlides} />
  ) : (
    <HeroVideoBlock hero={hero} />
  );
}
