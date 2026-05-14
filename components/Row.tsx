// LARAPLAY — Rangée horizontale scrollable type Netflix.

"use client";

import { useRef } from "react";
import type { VideoFile } from "@/lib/drive";
import { VideoCard } from "./VideoCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTV } from "@/lib/tv-client";

interface RowProps {
  title: string;
  videos: VideoFile[];
  href?: string;
  /** Vignette catégorie (utilisée comme thumbnail des vidéos qui en sont dépourvues) */
  categoryImage?: string | null;
}

export function Row({ title, videos, href, categoryImage }: RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTV = useTV();

  if (videos.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section data-tv-section={`row-${title}`} className="relative group/row mb-12">
      <div className="flex items-baseline justify-between px-4 md:px-12 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-sm text-zinc-400 hover:text-white transition opacity-0 group-hover/row:opacity-100"
          >
            Voir tout →
          </Link>
        )}
      </div>

      <div className="relative">
        {!isTV && (
          <button
            onClick={() => scroll("left")}
            aria-label="Précédent"
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-black/80 to-transparent items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition hidden md:flex"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          data-row-scroller
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 md:px-12 py-4"
        >
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} fallbackImage={categoryImage ?? null} />
          ))}
        </div>

        {!isTV && (
          <button
            onClick={() => scroll("right")}
            aria-label="Suivant"
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-black/80 to-transparent items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition hidden md:flex"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </section>
  );
}
