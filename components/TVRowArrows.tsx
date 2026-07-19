// LARAPLAY — Flèches de navigation TV pour rails horizontaux.

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
    let frame = 0;
    let lastLeft = false;
    let lastRight = false;

    const update = () => {
      const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const currentLeft = scroller.scrollLeft;
      const nextLeft = currentLeft > 4;
      const nextRight = currentLeft < maxLeft - 4;
      if (nextLeft !== lastLeft) {
        lastLeft = nextLeft;
        setCanScrollLeft(nextLeft);
      }
      if (nextRight !== lastRight) {
        lastRight = nextRight;
        setCanScrollRight(nextRight);
      }
    };

    // Un seul calcul de layout par frame même si le moteur émet une rafale de
    // scroll events pendant le recentrage D-pad.
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    const timers = [40, 250, 800].map((delay) => window.setTimeout(scheduleUpdate, delay));
    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      if (frame) window.cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [scrollRef]);

  const scrollByPage = (dir: "left" | "right") => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const delta = scroller.clientWidth * 0.82 * (dir === "left" ? -1 : 1);
    try {
      if (typeof scroller.scrollBy === "function") {
        scroller.scrollBy({ left: delta, behavior: "auto" });
      } else {
        scroller.scrollLeft += delta;
      }
    } catch {
      scroller.scrollLeft += delta;
    }
  };

  return (
    <>
      <button
        type="button"
        data-tv-row-arrow="left"
        tabIndex={-1}
        disabled={!canScrollLeft}
        aria-label="Parcourir la rangée vers la gauche"
        onClick={(e) => {
          e.stopPropagation();
          scrollByPage("left");
        }}
        className={[
          "tv-row-arrow absolute left-0 top-0 bottom-0 z-30 w-16",
          "items-center justify-start pl-3 bg-gradient-to-r from-black/85 via-black/35 to-transparent",
          "transition-opacity duration-150 disabled:pointer-events-none",
          canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <ChevronLeft className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]" />
      </button>
      <button
        type="button"
        data-tv-row-arrow="right"
        tabIndex={-1}
        disabled={!canScrollRight}
        aria-label="Parcourir la rangée vers la droite"
        onClick={(e) => {
          e.stopPropagation();
          scrollByPage("right");
        }}
        className={[
          "tv-row-arrow absolute right-0 top-0 bottom-0 z-30 w-16",
          "items-center justify-end pr-3 bg-gradient-to-l from-black/85 via-black/35 to-transparent",
          "transition-opacity duration-150 disabled:pointer-events-none",
          canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <ChevronRight className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]" />
      </button>
    </>
  );
}
