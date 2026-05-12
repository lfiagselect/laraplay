// LARAPLAY — Rangée "Choisissez votre ère".
// Carte = poster pleine intégrale. Titre déjà incrusté dans image.

"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { slugify } from "@/lib/catalog-meta";

interface EraRowProps {
  title: string;
  eras: { name: string; count: number; image: string | null }[];
}

export function EraRow({ title, eras }: EraRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="relative group/row mb-12">
      <div className="px-4 md:px-12 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition"
          aria-label="Précédent"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth px-4 md:px-12 py-4"
        >
          {eras.map((era) => (
            <Link
              key={era.name}
              href={`/category/${slugify(era.name)}`}
              className="era-card relative shrink-0 w-[150px] sm:w-[180px] md:w-[260px] aspect-[2/3] rounded-lg overflow-hidden border-2 border-zinc-800 bg-zinc-900"
              aria-label={era.name}
              onFocus={(e) => {
                if (typeof document === "undefined") return;
                if (!document.documentElement.classList.contains("tv")) return;
                try {
                  const target = e.currentTarget as HTMLElement;
                  const parent = target.parentElement;
                  if (!parent) return;
                  const tr = target.getBoundingClientRect();
                  const pr = parent.getBoundingClientRect();
                  const targetCenter = tr.left + tr.width / 2;
                  const parentCenter = pr.left + pr.width / 2;
                  parent.scrollBy({ left: targetCenter - parentCenter, behavior: "smooth" });
                } catch {}
              }}
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

              {/* Gradient sombre bas pour lisibilité titre */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

              {/* Titre overlay */}
              <h3 className="era-title absolute bottom-3 left-3 right-3 text-white drop-shadow-2xl pointer-events-none">
                {era.name}
              </h3>

              {/* Badge count discret coin haut droit */}
              <span className="absolute top-2 right-2 z-10 text-[10px] text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded">
                {era.count}
              </span>
            </Link>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition"
          aria-label="Suivant"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      </div>
    </section>
  );
}
