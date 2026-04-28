// LARAPLAY — Rangée Top 10 avec chiffres géants derrière cards.
// Style emblématique streaming premium.

"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { VideoFile } from "@/lib/drive";
import { useVideoModal } from "./ModalProvider";

interface Top10RowProps {
  title: string;
  videos: VideoFile[]; // limité à 10
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

  if (top10.length === 0) return null;

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
          className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition"
          aria-label="Précédent"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-4 md:px-12 py-6"
        >
          {top10.map((video, idx) => {
            const rank = idx + 1;
            const duration = formatDuration(video.videoMediaMetadata?.durationMillis);
            const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
            const thumb = video.thumbnailLink ? `/api/thumb/${video.id}` : null;

            return (
              <button
                key={video.id}
                type="button"
                onClick={() => open(video.id)}
                className="relative shrink-0 group/card flex items-center text-left"
              >
                {/* Chiffre géant en arrière-plan */}
                <span
                  className="text-[200px] md:text-[260px] font-black leading-none select-none"
                  style={{
                    fontFamily: "var(--font-bebas), Impact, sans-serif",
                    color: "transparent",
                    WebkitTextStroke: "2px #3f3f46",
                    textShadow:
                      "0 0 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.8)",
                    marginRight: "-40px",
                    lineHeight: "0.8",
                  }}
                >
                  {rank}
                </span>

                {/* Card vidéo */}
                <div className="relative w-[180px] md:w-[200px] aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 shadow-2xl transition-transform duration-300 group-hover/card:scale-105 group-hover/card:z-10">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
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

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition flex items-center justify-center">
                    <Play className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
                  </div>

                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">
                      {cleanName}
                    </p>
                    {duration && (
                      <p className="text-[10px] text-zinc-300 mt-1">{duration}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition"
          aria-label="Suivant"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      </div>
    </section>
  );
}
