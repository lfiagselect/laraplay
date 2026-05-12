// LARAPLAY — Hero carrousel.
// Image landscape 16:9 visible entièrement. Ken-burns lent.
// Mobile : swipe touch + indicateurs barres.
// Desktop : flèches gauche/droite hover + indicateurs.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const next = () => goto((index + 1) % slides.length);
  const prev = () => goto((index - 1 + slides.length) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  if (slides.length === 0) return null;
  const current = slides[index];

  return (
    <section
      className="relative group w-full bg-[var(--bg-main)] overflow-hidden aspect-video md:aspect-auto md:h-[68vh] md:min-h-[420px] md:max-h-[640px]"
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

      {/* Flèches navigation desktop — visibles au hover du carousel */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Précédent"
            className="hidden md:flex absolute left-0 top-0 bottom-0 z-30 w-16 items-center justify-center bg-gradient-to-r from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-10 h-10 text-white drop-shadow-lg" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Suivant"
            className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 w-16 items-center justify-center bg-gradient-to-l from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-10 h-10 text-white drop-shadow-lg" />
          </button>
        </>
      )}

      {/* Indicateurs barres fines */}
      <div className="absolute bottom-3 left-5 right-5 md:left-12 md:right-12 flex gap-1 z-30 pointer-events-auto">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goto(i)}
            aria-label={`Aller à la diapositive ${i + 1}`}
            className={`flex-1 h-0.5 md:h-[3px] rounded-full transition-all ${
              i === index ? "bg-white" : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Pour SR */}
      <span className="sr-only">{current.alt}</span>
    </section>
  );
}
