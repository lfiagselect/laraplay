// LARAPLAY — Flèches de navigation TV pour rails horizontaux.
// Elles sont affichées sur TV dès qu'un rail peut continuer à gauche/droite,
// comme l'affordance Netflix TV. La navigation reste pilotée par le D-pad.

"use client";

import { useEffect, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TVRowArrowsProps {
  scrollRef: RefObject<HTMLElement | null>;
}

export function TVRowArrows({ scrollRef }: TVRowArrowsProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const update = () => {
      const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const currentLeft = scroller.scrollLeft;
      setCanScrollLeft(currentLeft > 4);
      setCanScrollRight(currentLeft < maxLeft - 4);
    };

    update();
    const timers = [40, 250, 800].map((delay) => window.setTimeout(update, delay));
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollRef]);

  return (
    <>
      <div
        data-tv-row-arrow="left"
        aria-hidden="true"
        className={[
          "tv-row-arrow pointer-events-none absolute left-0 top-0 bottom-0 z-30 w-16",
          "items-center justify-start pl-3 bg-gradient-to-r from-black/85 via-black/35 to-transparent",
          "transition-opacity duration-150",
          canScrollLeft ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <ChevronLeft className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]" />
      </div>
      <div
        data-tv-row-arrow="right"
        aria-hidden="true"
        className={[
          "tv-row-arrow pointer-events-none absolute right-0 top-0 bottom-0 z-30 w-16",
          "items-center justify-end pr-3 bg-gradient-to-l from-black/85 via-black/35 to-transparent",
          "transition-opacity duration-150",
          canScrollRight ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <ChevronRight className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]" />
      </div>
    </>
  );
}
