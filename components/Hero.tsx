// LARAPLAY — Hero billboard. Vidéo featured large en haut accueil.
// Optim perf: image poster preview, pas vidéo background lourde.

import Link from "next/link";
import type { VideoFile } from "@/lib/video-types";
import { Play, Info } from "lucide-react";

interface HeroProps {
  video: VideoFile;
  /** Image fond (PNG haute qualité catégorie associée si dispo) */
  backgroundImage?: string | null;
}

export function Hero({ video, backgroundImage }: HeroProps) {
  const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
  const thumb = video.bunnyThumbnail ?? null;
  const bg = backgroundImage ?? thumb;

  return (
    <section className="relative h-[55vh] md:h-[65vh] min-h-[400px] w-full overflow-hidden -mt-[72px]">
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          alt={cleanName}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ imageRendering: "auto" }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black" />
      )}

      {/* Léger blur derrière pour adoucir upscale image */}
      <div
        className="absolute inset-0 backdrop-blur-[2px] bg-black/10"
        aria-hidden
      />

      <div className="absolute inset-0 hero-side-gradient" />
      <div className="absolute inset-0 hero-gradient" />

      <div className="relative h-full flex items-end pb-16 md:pb-24">
        <div className="max-w-2xl px-4 md:px-12">
          <p className="text-xs uppercase tracking-widest text-red-500 font-bold mb-2">
            À l'affiche
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg leading-tight mb-3">
            {cleanName}
          </h1>
          {video.category && (
            <p className="text-sm md:text-base text-zinc-300 mb-6">
              {video.category}
            </p>
          )}
          <div className="flex gap-3">
            <Link
              href={`/watch/${video.id}`}
              className="flex items-center gap-2 bg-white text-black font-bold px-7 py-3 rounded hover:bg-zinc-200 transition"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Lecture
            </Link>
            <Link
              href={`/watch/${video.id}`}
              className="flex items-center gap-2 bg-zinc-700/70 text-white font-bold px-7 py-3 rounded hover:bg-zinc-700/90 backdrop-blur-sm transition"
            >
              <Info className="w-5 h-5" />
              Plus d'infos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
