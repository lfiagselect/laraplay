// LARAPLAY — Rangée Top 10 avec chiffres géants derrière cards.
// Glow rouge : intense sur desktop, doux sur mobile (lisibilité).

"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { VideoFile } from "@/lib/drive";
import { useVideoModal } from "./ModalProvider";
import { useTV } from "@/lib/tv-client";

interface Top10RowProps {
  title: string;
  videos: VideoFile[];
}

function formatDuration(ms?: string): string | null {
  if (!ms) return null;
  const total = Math.floor(Number(ms) / 1000);
  if (!total) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}min`;
}

export function Top10Row({ title, videos }: Top10RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const top10 = videos.slice(0, 10);
  const { open } = useVideoModal();
  const isTV = useTV();

  if (top10.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section data-tv-section="top10" className="relative group/row mb-12">
      <div className="px-4 md:px-12 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="relative">
        {!isTV && (
          <button
            onClick={() => scroll("left")}
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Pr\u00e9c\u00e9dent"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          data-row-scroller
          className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-4 md:px-12 py-6"
        >
          {top10.map((video, idx) => (
            <Top10Card
              key={video.id}
              video={video}
              rank={idx + 1}
              duration={formatDuration(video.videoMediaMetadata?.durationMillis)}
              cleanName={video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "")}
              onOpen={() => open(video.id)}
            />
          ))}
        </div>

        {!isTV && (
          <button
            onClick={() => scroll("right")}
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Suivant"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </section>
  );
}

interface Top10CardProps {
  video: VideoFile;
  rank: number;
  duration: string | null;
  cleanName: string;
  onOpen: () => void;
}

function Top10Card({ video, rank, duration, cleanName, onOpen }: Top10CardProps) {
  const thumbSrc = video.bunnyThumbnail ?? (video.thumbnailLink ? `/api/thumb/${video.id}` : null);

  // Glow desktop : 3 couches intenses
  // Glow mobile : 1 couche très douce pour garder la lisibilité du chiffre
  const glowDesktop = [
    "0 0 20px rgba(229,9,20,0.6)",
    "0 0 45px rgba(229,9,20,0.35)",
    "0 0 80px rgba(229,9,20,0.15)",
  ].join(", ");
  const glowMobile = "0 0 12px rgba(229,9,20,0.25)";

  // On choisit via CSS custom property injectée inline,
  // mais textShadow JS ne gère pas les media queries —
  // on utilise deux <span> : un visible mobile, un visible desktop.
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ touchAction: "manipulation" }}
      // onFocus scroll géré centralement par lib/spatial-nav focusEl()
      className="relative shrink-0 group/card flex items-end text-left -mr-3 md:-mr-8"
    >
      {/* Mobile : glow doux */}
      <span
        aria-hidden="true"
        className="md:hidden top10-rank text-[110px] sm:text-[150px] font-black leading-none select-none flex-shrink-0"
        style={{
          fontFamily: "var(--font-bebas), Impact, sans-serif",
          color: "transparent",
          WebkitTextStroke: "2px #e50914",
          textShadow: glowMobile,
          lineHeight: "0.85",
          transform: "translateY(8px)",
        }}
      >
        {rank}
      </span>

      {/* Desktop : glow intense */}
      <span
        aria-hidden="true"
        className="hidden md:inline top10-rank text-[220px] font-black leading-none select-none flex-shrink-0"
        style={{
          fontFamily: "var(--font-bebas), Impact, sans-serif",
          color: "transparent",
          WebkitTextStroke: "3px #e50914",
          textShadow: glowDesktop,
          lineHeight: "0.85",
          transform: "translateY(8px)",
        }}
      >
        {rank}
      </span>

      {/* Card vidéo */}
      <div className="relative w-[130px] sm:w-[160px] md:w-[200px] aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 shadow-2xl transition-transform duration-200 group-hover/card:scale-105 group-hover/card:z-10">
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt={cleanName}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Play className="w-10 h-10 text-zinc-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
        </div>

        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">{cleanName}</p>
          {duration && <p className="text-[10px] text-zinc-300 mt-1">{duration}</p>}
        </div>
      </div>
    </button>
  );
}
