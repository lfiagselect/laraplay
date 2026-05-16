// LARAPLAY — Indicateurs de navigation TV pour rails horizontaux.
// Visuels uniquement: la télécommande navigue les cartes, les flèches indiquent
// qu'il reste du contenu à gauche/droite comme sur Netflix TV.

"use client";

import { useEffect, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTV } from "@/lib/tv-client";

interface TVRowArrowsProps {
  scrollRef: RefObject<HTMLElement | null>;
}

export function TVRowArrows({ scrollRef }: TVRowArrowsProps) {
  const isTV = useTV();
  const [focusWithin, setFocusWithin] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!isTV) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const section = scroller.closest<HTMLElement>("[data-tv-section]");
    if (!section) return;

    const update = () => {
      const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const currentLeft = scroller.scrollLeft;
      setCanScrollLeft(currentLeft > 4);
      setCanScrollRight(currentLeft < maxLeft - 4);
    };

    const onFocusIn = () => {
      setFocusWithin(true);
      window.setTimeout(update, 40);
      window.setTimeout(update, 240);
    };
    const onFocusOut = (e: FocusEvent) => {
      const nextTarget = e.relatedTarget instanceof Node ? e.relatedTarget : null;
      if (nextTarget && section.contains(nextTarget)) return;
      setFocusWithin(false);
      update();
    };

    update();
    section.addEventListener("focusin", onFocusIn);
    section.addEventListener("focusout", onFocusOut);
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      section.removeEventListener("focusin", onFocusIn);
      section.removeEventListener("focusout", onFocusOut);
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isTV, scrollRef]);

  if (!isTV) return null;

  return (
    <>
      <div
        data-tv-row-arrow="left"
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-0 top-0 bottom-0 z-30 w-16",
          "items-center justify-start pl-3 bg-gradient-to-r from-black/85 via-black/35 to-transparent",
          "transition-opacity duration-150",
          focusWithin && canScrollLeft ? "flex opacity-100" : "flex opacity-0",
        ].join(" ")}
      >
        <ChevronLeft className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]" />
      </div>
      <div
        data-tv-row-arrow="right"
        aria-hidden="true"
        className={[
          "pointer-events-none absolute right-0 top-0 bottom-0 z-30 w-16",
          "items-center justify-end pr-3 bg-gradient-to-l from-black/85 via-black/35 to-transparent",
          "transition-opacity duration-150",
          focusWithin && canScrollRight ? "flex opacity-100" : "flex opacity-0",
        ].join(" ")}
      >
        <ChevronRight className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.9)]" />
      </div>
    </>
  );
}
