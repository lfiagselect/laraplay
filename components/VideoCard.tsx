// LARAPLAY — Carte vidéo.

import Link from "next/link";
import type { VideoFile } from "@/lib/drive";
import { Play } from "lucide-react";

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

interface VideoCardProps {
  video: VideoFile;
  /** Image catégorie servant de fallback si Drive thumbnail manquant */
  fallbackImage?: string | null;
}

export function VideoCard({ video, fallbackImage }: VideoCardProps) {
  const duration = formatDuration(video.videoMediaMetadata?.durationMillis);
  // Thumbnail Drive proxy. Désactivé sur prod si fallback dispo (perf).
  // Drive thumb = fetch supplémentaire, fallback image catégorie statique = CDN cache.
  const thumb = !fallbackImage && video.thumbnailLink ? `/api/thumb/${video.id}` : null;

  return (
    <Link
      href={`/watch/${video.id}`}
      className="video-card group block w-[260px] md:w-[300px] shrink-0 rounded-md overflow-hidden bg-zinc-900 relative"
    >
      <div className="aspect-video bg-zinc-800 relative overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={video.name}
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
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
        </div>
        {duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
            {duration}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-tight">
          {video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "")}
        </h3>
        {video.category && (
          <p className="text-xs text-zinc-500 mt-1">{video.category}</p>
        )}
      </div>
    </Link>
  );
}
