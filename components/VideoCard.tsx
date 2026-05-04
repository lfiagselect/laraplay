// LARAPLAY — Carte vidéo. Clic = ouvre modal info.
// Hover desktop V2: scale 1.12, delay 200ms, gradient bottom, actions ronde, metadata.
// Mobile: aucun hover (touch).
// Préload stream au hover desktop + IntersectionObserver mobile.

"use client";

import { useState, useRef } from "react";
import type { VideoFile } from "@/lib/drive";
import { Play, Plus, Info } from "lucide-react";
import { useVideoModal } from "./ModalProvider";
import { useHoverPreload, useViewportPreload } from "@/lib/preload";

const HOVER_DELAY_MS = 200;

function formatDuration(ms?: string): string | null {
  if (!ms) return null;
  const total = Math.floor(Number(ms) / 1000);
  if (!total) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatYear(modifiedTime?: string): string | null {
  if (!modifiedTime) return null;
  const y = new Date(modifiedTime).getFullYear();
  return isFinite(y) ? String(y) : null;
}

interface VideoCardProps {
  video: VideoFile;
  fallbackImage?: string | null;
}

export function VideoCard({ video, fallbackImage }: VideoCardProps) {
  const duration = formatDuration(video.videoMediaMetadata?.durationMillis);
  const year = formatYear(video.modifiedTime);
  const thumb = !fallbackImage && video.thumbnailLink ? `/api/thumb/${video.id}` : null;
  const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
  const { open } = useVideoModal();
  const hover = useHoverPreload(video.id);
  const viewportRef = useViewportPreload(video.id);

  const [isHover, setIsHover] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    hover.onMouseEnter();
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setIsHover(true), HOVER_DELAY_MS);
  };
  const onLeave = () => {
    hover.onMouseLeave();
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setIsHover(false);
  };

  return (
    <article
      ref={viewportRef as React.RefObject<HTMLElement>}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="group relative shrink-0 w-[180px] sm:w-[220px] md:w-[280px] lg:w-[300px] overflow-visible"
    >
      <button
        type="button"
        onClick={() => open(video.id)}
        className={[
          "relative block aspect-video w-full overflow-hidden rounded-md bg-[var(--bg-elevated)] text-left",
          "transition-transform duration-200 ease-out",
          isHover ? "md:scale-[1.12] md:z-30 md:shadow-[0_18px_45px_rgba(0,0,0,.75)]" : "",
        ].join(" ")}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={cleanName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : fallbackImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallbackImage}
            alt={video.category ?? video.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 flex items-center justify-center">
            <Play className="w-12 h-12 text-zinc-500" />
          </div>
        )}

        {/* Gradient overlay desktop hover - apparaît avec la card étendue */}
        <div
          className={[
            "pointer-events-none absolute inset-0 transition-opacity duration-200",
            "bg-gradient-to-t from-black/95 via-black/40 to-transparent",
            isHover ? "md:opacity-100" : "md:opacity-0",
            "opacity-0",
          ].join(" ")}
        />

        {/* Mobile/touch overlay simple Play */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-active:opacity-100 md:hidden flex items-center justify-center transition-opacity">
          <Play className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
        </div>

        {/* Duration badge — toujours visible */}
        {duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
            {duration}
          </span>
        )}

        {/* Hover actions desktop only — apparaît dans gradient bas */}
        <div
          className={[
            "hidden md:flex absolute bottom-3 left-3 right-3 items-center gap-2 transition-opacity duration-200",
            isHover ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <span
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
            title="Lecture"
          >
            <Play className="w-4 h-4" fill="currentColor" />
          </span>
          <span
            className="w-8 h-8 rounded-full border border-white/60 bg-black/50 text-white flex items-center justify-center"
            title="Ma liste"
          >
            <Plus className="w-4 h-4" />
          </span>
          <span
            className="ml-auto w-8 h-8 rounded-full border border-white/60 bg-black/50 text-white flex items-center justify-center"
            title="Plus d'infos"
          >
            <Info className="w-4 h-4" />
          </span>
        </div>

        {/* Hover metadata desktop only - titre + année + catégorie */}
        <div
          className={[
            "hidden md:block absolute left-3 right-3 transition-opacity duration-200",
            "bottom-12",
            isHover ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <h3 className="text-white text-sm font-semibold line-clamp-1 drop-shadow-lg">
            {cleanName}
          </h3>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5 line-clamp-1">
            {[year, video.category].filter(Boolean).join(" · ")}
          </p>
        </div>
      </button>

      {/* Texte sous la card (mobile + état non-hover desktop) */}
      <div
        className={[
          "p-2.5 transition-opacity duration-200",
          "md:opacity-100",
          isHover ? "md:opacity-0" : "",
        ].join(" ")}
      >
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-tight">
          {cleanName}
        </h3>
        {video.category && (
          <p className="text-xs text-[var(--text-muted)] mt-1">{video.category}</p>
        )}
      </div>
    </article>
  );
}
