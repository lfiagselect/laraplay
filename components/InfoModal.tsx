// LARAPLAY â€” Modal "Plus d'infos" type Netflix
// Desktop: modal centrÃ© max-w-4xl. Mobile: bottom sheet avec drag handle (V2 Â§8.1).
// PrÃ©view vidÃ©o montÃ© aprÃ¨s 600ms â€” Ã©conomise bandwidth si user ferme vite.
// TV (I3): skip preview vidÃ©o entirement (Ã©conomise bandwidth Drive + perf TV ARM)
//          + focus initial sur bouton Lecture aprÃ¨s mount.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Plus, Check, ThumbsUp, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { VideoFile } from "@/lib/drive";
import { VideoCard } from "./VideoCard";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { useTV } from "@/lib/tv-client";

interface InfoModalProps {
  video: VideoFile;
  related: VideoFile[];
  userEmail?: string | null;
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

const DRAG_CLOSE_THRESHOLD = 120;

export function InfoModal({ video, related, userEmail, onClose }: InfoModalProps) {
  const isTV = useTV();
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [shouldMountVideo, setShouldMountVideo] = useState(false);
  const [fav, setFav] = useState(false);
  const [dragY, setDragY] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const router = useRouter();

  // Skip preview vidÃ©o TV (Ã©conomise bandwidth + perf)
  useEffect(() => {
    if (isTV) {
      setVideoReady(true); // hide loader (poster suffit)
      return;
    }
    const t = setTimeout(() => setShouldMountVideo(true), 600);
    return () => clearTimeout(t);
  }, [isTV]);

  // Focus initial Play button TV
  useEffect(() => {
    if (!isTV) return;
    const t = setTimeout(() => playBtnRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [isTV]);

  useEffect(() => {
    if (!userEmail) return;
    setFav(isFavorite(userEmail, video.id));
  }, [userEmail, video.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  const goWatch = () => {
    onClose();
    router.push(`/watch/${video.id}`);
  };

  const onToggleFav = () => {
    if (!userEmail) return;
    const next = toggleFavorite(userEmail, video.id);
    setFav(next);
  };

  const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
  const duration = formatDuration(video.videoMediaMetadata?.durationMillis);
  const size = formatSize(video.size);
  const resolution =
    video.videoMediaMetadata?.width && video.videoMediaMetadata?.height
      ? `${video.videoMediaMetadata.width}Ã—${video.videoMediaMetadata.height}`
      : null;

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

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;
    dragStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragStartY.current === null) return;
    if (dragY > DRAG_CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm overflow-y-auto md:overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={sheetRef}
        data-tv-trap="modal"
        className={[
          "relative w-full max-w-4xl bg-zinc-950 overflow-hidden shadow-2xl",
          "md:mx-auto md:my-8 md:rounded-lg md:animate-modal-enter",
          "fixed md:relative bottom-0 left-0 right-0 rounded-t-2xl md:rounded-t-lg max-h-[92vh] md:max-h-none animate-sheet-slide-up md:animate-modal-enter",
        ].join(" ")}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragY === 0 ? "transform 200ms ease-out" : "none",
          paddingTop: "env(safe-area-inset-top, 0)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-mobile-drag-handle className="md:hidden flex justify-center py-2 cursor-grab touch-none">
          <span className="block w-10 h-1 rounded-full bg-white/30" />
        </div>

        <div className="overflow-y-auto max-h-[88vh] md:max-h-none">
          <div className="relative aspect-video bg-black overflow-hidden">
            {video.thumbnailLink && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/thumb/${video.id}`}
                alt={cleanName}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {shouldMountVideo && !isTV && (
              <video
                ref={videoRef}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                poster={video.thumbnailLink ? `/api/thumb/${video.id}` : undefined}
                className="absolute inset-0 w-full h-full object-cover"
                src={`/api/stream/${video.id}`}
                onCanPlay={() => setVideoReady(true)}
              />
            )}

            {!videoReady && !isTV && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />

            <button
              onClick={onClose}
              data-tv-close
              data-focusable
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-center transition"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {!isTV && (
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
            )}

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-lg mb-4 max-w-2xl">
                {cleanName}
              </h2>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  ref={playBtnRef}
                  data-focusable
                  onClick={goWatch}
                  className="flex items-center gap-2 bg-white text-black font-bold px-7 py-2.5 rounded hover:bg-zinc-200 transition active:scale-[0.98]"
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  Lecture
                </button>
                <button
                  data-focusable
                  onClick={onToggleFav}
                  disabled={!userEmail}
                  className="w-11 h-11 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition disabled:opacity-50"
                  aria-label={fav ? "Retirer de ma liste" : "Ajouter Ã  ma liste"}
                  title={fav ? "Retirer de ma liste" : "Ajouter Ã  ma liste"}
                >
                  {fav ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Plus className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  data-focusable
                  className="w-11 h-11 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition"
                  aria-label="J'aime"
                  title="J'aime (bientÃ´t)"
                >
                  <ThumbsUp className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

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
                    <span className="text-zinc-500">CatÃ©gorie : </span>
                    <span className="text-zinc-200">{video.category}</span>
                  </p>
                )}
                {video.modifiedTime && (
                  <p>
                    <span className="text-zinc-500">AjoutÃ© le : </span>
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
                  Autres vidÃ©os similaires
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

