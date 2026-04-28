// LARAPLAY — Modal "Plus d'infos" type Netflix
// Affiche détails vidéo + boutons + similaires sans quitter la page.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Plus, ThumbsUp, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { VideoFile } from "@/lib/drive";
import { VideoCard } from "./VideoCard";

interface InfoModalProps {
  video: VideoFile;
  related: VideoFile[];
  onClose: () => void;
}

function formatDuration(ms?: string): string | null {
  if (!ms) return null;
  const total = Math.floor(Number(ms) / 1000);
  if (!total) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatSize(size?: string): string | null {
  if (!size) return null;
  const n = Number(size);
  if (!n) return null;
  if (n > 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Go`;
  return `${(n / 1_000_000).toFixed(0)} Mo`;
}

export function InfoModal({ video, related, onClose }: InfoModalProps) {
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const goWatch = () => {
    onClose();
    router.push(`/watch/${video.id}`);
  };

  const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
  const duration = formatDuration(video.videoMediaMetadata?.durationMillis);
  const size = formatSize(video.size);
  const resolution =
    video.videoMediaMetadata?.width && video.videoMediaMetadata?.height
      ? `${video.videoMediaMetadata.width}×${video.videoMediaMetadata.height}`
      : null;

  // Escape ferme modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="min-h-screen flex items-start justify-center py-8 px-4">
        <div className="relative w-full max-w-4xl bg-zinc-950 rounded-lg overflow-hidden shadow-2xl animate-modal-enter">
          {/* Header vidéo preview */}
          <div className="relative aspect-video bg-black overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted={muted}
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
              src={`/api/stream/${video.id}`}
              onCanPlay={() => setVideoReady(true)}
            />

            {/* Loader pendant chargement */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
              </div>
            )}

            {/* Gradient bas */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />

            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-center transition"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Bouton mute */}
            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute bottom-6 right-6 z-20 w-10 h-10 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition"
              aria-label={muted ? "Activer son" : "Couper son"}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Titre + actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-lg mb-4 max-w-2xl">
                {cleanName}
              </h2>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={goWatch}
                  className="flex items-center gap-2 bg-white text-black font-bold px-7 py-2.5 rounded hover:bg-zinc-200 transition"
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  Lecture
                </button>
                <button
                  className="w-10 h-10 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition"
                  aria-label="Ajouter à ma liste"
                  title="Ajouter à ma liste (bientôt)"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
                <button
                  className="w-10 h-10 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition"
                  aria-label="J'aime"
                  title="J'aime (bientôt)"
                >
                  <ThumbsUp className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Métadonnées + description */}
          <div className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2">
                <div className="flex flex-wrap gap-2 text-sm text-zinc-300 mb-4">
                  {duration && (
                    <span className="text-green-500 font-semibold">{duration}</span>
                  )}
                  {resolution && <span className="text-zinc-400">{resolution}</span>}
                  {size && <span className="text-zinc-400">{size}</span>}
                  <span className="px-1.5 border border-zinc-600 rounded text-xs text-zinc-300">
                    HD
                  </span>
                </div>
                {video.description ? (
                  <p className="text-zinc-200 leading-relaxed whitespace-pre-line">
                    {video.description}
                  </p>
                ) : (
                  <p className="text-zinc-400 italic">Aucune description disponible.</p>
                )}
              </div>

              <aside className="text-sm space-y-2">
                {video.category && (
                  <p>
                    <span className="text-zinc-500">Catégorie : </span>
                    <span className="text-zinc-200">{video.category}</span>
                  </p>
                )}
                {video.modifiedTime && (
                  <p>
                    <span className="text-zinc-500">Ajouté le : </span>
                    <span className="text-zinc-200">
                      {new Date(video.modifiedTime).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-zinc-500">Format : </span>
                  <span className="text-zinc-200">
                    {video.mimeType.replace("video/", "").toUpperCase()}
                  </span>
                </p>
              </aside>
            </div>

            {related.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Autres vidéos similaires
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {related.slice(0, 6).map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
