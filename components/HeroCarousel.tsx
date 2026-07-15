// LARAPLAY — Hero carrousel.
// Image landscape 16:9 visible entièrement. Ken-burns lent.
// Mobile : swipe touch + indicateurs barres.
// Desktop : flèches gauche/droite hover + indicateurs.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useTV } from "@/lib/tv-client";

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
  const [focusWithin, setFocusWithin] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const isTV = useTV();

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Rotation suspendue au focus, sur TV, en mouvement réduit ou sur demande.
  useEffect(() => {
    if (slides.length <= 1 || focusWithin || paused || reducedMotion || isTV) return;
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [slides.length, intervalMs, focusWithin, paused, reducedMotion, isTV, index]);

  const goto = (i: number) => {
    setIndex(i);
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
      className="hero-section relative group w-full bg-[var(--bg-main)] overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) setFocusWithin(false);
      }}
    >
      {/* Stack d'images cross-fade */}
      {slides.map((slide, i) => (
        <button
          key={slide.href}
          type="button"
          onClick={() => router.push(slide.href)}
          aria-label={slide.alt}
          aria-hidden={i !== index}
          inert={i !== index}
          tabIndex={i === index ? 0 : -1}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          {/* Mobile portrait: blur-fill background (évite crop massif 16:9 source) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60 md:hidden"
            loading={i === 0 ? "eager" : "lazy"}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt={slide.alt}
            className={`absolute inset-0 w-full h-full object-contain md:object-cover ${
              i === index ? "animate-ken-burns" : ""
            }`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        </button>
      ))}

      {/* Gradient bas léger pour transition vers rows */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b0b0b] via-black/30 to-transparent pointer-events-none z-20" />

      {/* Flèches navigation desktop — visibles au hover. Render zero TV. */}
      {slides.length > 1 && !isTV && (
        <>
          <button
            type="button"
            tabIndex={-1}
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
            tabIndex={-1}
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

      {slides.length > 1 && !isTV && !reducedMotion && (
        <button
          type="button"
          data-tv-compact
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Reprendre le carrousel" : "Mettre le carrousel en pause"}
          className="absolute bottom-8 right-3 md:right-5 z-30 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
        </button>
      )}

      {/* Indicateurs barres fines — centrés, largeur fixe */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-30 pointer-events-auto">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            data-tv-compact
            tabIndex={-1}
            onClick={() => goto(i)}
            aria-label={`Aller à la diapositive ${i + 1}`}
            className={`w-8 md:w-10 h-[3px] rounded-full transition-all ${
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
