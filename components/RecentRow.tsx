// LARAPLAY – Rangée "Ajouts récents" (4 dernières vidéos Bunny)
"use client";

import { useRef } from "react";
import { Play } from "lucide-react";
import type { VideoFile } from "@/lib/bunny";
import { useVideoModal } from "./ModalProvider";
import { TVRowArrows } from "./TVRowArrows";
import { formatDuration } from "@/lib/format";

interface RecentRowProps {
  title: string;
  videos: VideoFile[];
}

export function RecentRow({ title, videos }: RecentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { open } = useVideoModal();
  if (videos.length === 0) return null;

  return (
    <section data-tv-section="recent" className="relative mb-12">
      <div className="px-4 md:px-12 mb-4 flex items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
        <span className="text-[10px] uppercase tracking-widest bg-[var(--accent)] text-white px-2 py-0.5 rounded font-bold">
          Nouveau
        </span>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          data-row-scroller
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 md:px-12 py-4"
        >
        {videos.map((video) => {
          const thumbSrc = video.bunnyThumbnail ?? null;
          const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
          const duration = formatDuration(video.videoMediaMetadata?.durationMillis);

          return (
            <button
              key={video.id}
              type="button"
              data-focusable
              data-tv-row-item
              onClick={() => open(video.id)}
              className="relative group shrink-0 w-[180px] sm:w-[220px] md:w-[280px] lg:w-[300px] aspect-video rounded-md overflow-hidden bg-zinc-900 shadow-lg hover:scale-105 transition-transform duration-200 text-left"
            >
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
                  <Play className="w-8 h-8 text-zinc-600" />
                </div>
              )}

              <div className="absolute top-2 left-2 bg-[var(--accent)] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                Nouveau
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-10 h-10 text-white drop-shadow-lg" fill="currentColor" />
              </div>

              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">
                  {cleanName}
                </p>
                {duration && <p className="text-[10px] text-zinc-300 mt-0.5">{duration}</p>}
              </div>
            </button>
          );
        })}
        </div>
        <TVRowArrows scrollRef={scrollRef} />
      </div>
    </section>
  );
}
