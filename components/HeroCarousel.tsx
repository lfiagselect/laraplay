// LARAPLAY — Hero carrousel mobile
// Défilement auto + swipe touch. Clic vignette → page catégorie.

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
  /** Délai entre slides en ms (défaut 4000) */
  intervalMs?: number;
}

export function HeroCarousel({ slides, intervalMs = 4000 }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Auto-advance
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

  return (
    <section
      className="relative w-full -mt-[72px] bg-black overflow-hidden h-[60vh] min-h-[400px] max-h-[640px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {slides.map((slide, i) => (
        <button
          key={slide.href}
          type="button"
          onClick={() => router.push(slide.href)}
          aria-label={slide.alt}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          tabIndex={i === index ? 0 : -1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.alt}
            className="absolute inset-0 w-full h-full object-cover"
            loading={i === 0 ? "eager" : "lazy"}
          />
        </button>
      ))}

      {/* Gradient bas — transition vers rangées */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-20" />

      {/* Indicateurs */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goto(i)}
            aria-label={`Aller à la diapositive ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
