// LARAPLAY — Hero carrousel mobile cinématographique (V2 §4.3)
// Image landscape 16:9 visible entièrement (pas de crop). Ken-burns lent + gradient + CTA.
// Auto-advance + swipe touch.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

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
      {/* Stack d'images cross-fade — image entière visible (object-cover sur ratio identique = pas de crop) */}
      {slides.map((slide, i) => (
        <div
          key={slide.href}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100 z-10" : "opacity-0 z-0"
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
        </div>
      ))}

      {/* Gradient bas seulement (pas latéral) — préserve image visible entière */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/55 to-transparent pointer-events-none z-20" />

      {/* Contenu : titre + CTA — superposé sur le gradient bas */}
      <button
        type="button"
        onClick={() => router.push(current.href)}
        className="absolute inset-x-0 bottom-0 z-30 px-5 pb-9 text-left animate-hero-fade-up active:scale-[0.99] transition"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] font-bold mb-1.5">
          À découvrir
        </p>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-3 leading-tight drop-shadow-2xl line-clamp-2">
          {current.alt}
        </h2>
        <span className="inline-flex items-center gap-2 bg-white text-black font-bold px-5 py-2 rounded shadow-lg text-sm">
          <Play className="w-4 h-4" fill="currentColor" />
          Lecture
        </span>
      </button>

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
    </section>
  );
}
