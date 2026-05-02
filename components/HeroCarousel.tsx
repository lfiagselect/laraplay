// LARAPLAY — Hero carrousel mobile cinématographique (V2 §4.3)
// Image dominante avec ken-burns lent, gradient cinématographique, CTA visible.
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
      className="relative w-full md:-mt-[72px] bg-[var(--bg-main)] overflow-hidden aspect-[3/4] sm:aspect-video md:aspect-auto md:h-[68vh] md:min-h-[400px] md:max-h-[640px] min-h-[62vh]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Stack d'images cross-fade */}
      {slides.map((slide, i) => (
        <div
          key={slide.href}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Ken Burns sur image active uniquement */}
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

      {/* Gradient gauche + bas cinématographique V2 §4.3 */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b]/85 via-[#0b0b0b]/30 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/70 to-transparent pointer-events-none z-20" />

      {/* Contenu : titre + CTA */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-12 animate-hero-fade-up">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] font-bold mb-2">
          À découvrir
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight drop-shadow-2xl">
          {current.alt}
        </h2>
        <button
          type="button"
          onClick={() => router.push(current.href)}
          className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded shadow-lg active:scale-[0.98] transition"
        >
          <Play className="w-5 h-5" fill="currentColor" />
          Lecture
        </button>
      </div>

      {/* Indicateurs barres fines V2 §4.3 */}
      <div className="absolute bottom-4 left-5 right-5 flex gap-1 z-30">
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
