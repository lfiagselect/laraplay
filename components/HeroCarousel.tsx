// LARAPLAY — Hero carrousel mobile.
// Image landscape 16:9 visible entièrement. Pas de texte — vignettes en dessous portent l'info.
// Clic image = navigate. Auto-advance + swipe touch. Indicateurs barres fines.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface HeroCarouselSlide {
  image: string;
  alt: string;
  href: string;
}

interface HeroCarouselProps {
  slides: HeroCarouselSlide[];
  intervalMs?: number;
}

export function HeroCarousel({ slides, intervalMs = 5500 }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs]);

  const goto = (i: number) => {
    setIndex(i);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setIndex((cur) => (cur + 1) % slides.length);
      }, intervalMs);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goto((index + 1) % slides.length);
      else goto((index - 1 + slides.length) % slides.length);
    }
    touchStartX.current = null;
  };

  if (slides.length === 0) return null;
  const current = slides[index];

  return (
    <section
      className="relative w-full md:-mt-[72px] bg-[var(--bg-main)] overflow-hidden aspect-video md:aspect-auto md:h-[68vh] md:min-h-[400px] md:max-h-[640px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Stack d'images cross-fade */}
      {slides.map((slide, i) => (
        <button
          key={slide.href}
          type="button"
          onClick={() => router.push(slide.href)}
          aria-label={slide.alt}
          tabIndex={i === index ? 0 : -1}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.alt}
            className={`absolute inset-0 w-full h-full object-cover ${
              i === index ? "animate-ken-burns" : ""
            }`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        </button>
      ))}

      {/* Gradient bas léger pour transition vers rows */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b0b0b] via-black/30 to-transparent pointer-events-none z-20" />

      {/* Indicateurs barres fines */}
      <div className="absolute bottom-3 left-5 right-5 flex gap-1 z-30 pointer-events-auto">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goto(i)}
            aria-label={`Aller à la diapositive ${i + 1}`}
            className={`flex-1 h-0.5 rounded-full transition-all ${
              i === index ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Pour SR */}
      <span className="sr-only">{current.alt}</span>
    </section>
  );
}
