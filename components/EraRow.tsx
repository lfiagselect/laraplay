// LARAPLAY — Rangée "Choisissez votre ère".

"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { slugify } from "@/lib/catalog-meta";
import { useTV } from "@/lib/tv-client";
import { TVRowArrows } from "./TVRowArrows";

interface EraRowProps {
  title: string;
  eras: { name: string; count: number; image: string | null }[];
}

export function EraRow({ title, eras }: EraRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTV = useTV();

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section data-tv-section="eras" className="relative group/row mb-12">
      <div className="px-4 md:px-12 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </div>

      <div className="relative">
        {!isTV && (
          <button
            onClick={() => scroll("left")}
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          data-row-scroller
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth px-4 md:px-12 py-4"
        >
          {eras.map((era) => (
            <Link
              key={era.name}
              href={`/category/${slugify(era.name)}`}
              data-focusable
              data-tv-row-item
              className="era-card relative shrink-0 w-[150px] sm:w-[180px] md:w-[260px] aspect-[2/3] rounded-lg overflow-hidden border-2 border-zinc-800 bg-zinc-900"
              aria-label={era.name}
            >
              {era.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={era.image}
                  alt={era.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
              <h3 className="era-title absolute bottom-3 left-3 right-3 text-white drop-shadow-2xl pointer-events-none">
                {era.name}
              </h3>
              <span className="absolute top-2 right-2 z-10 text-[10px] text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded">
                {era.count}
              </span>
            </Link>
          ))}
        </div>

        <TVRowArrows scrollRef={scrollRef} />

        {!isTV && (
          <button
            onClick={() => scroll("right")}
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition"
            aria-label="Suivant"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </section>
  );
}
