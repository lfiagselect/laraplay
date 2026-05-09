// LARAPLAY — Modal "Plus d'infos" type Netflix
// Preview vidéo :
//   - Bunny embed : paramètre ?t={seconds} pour démarrage aléatoire (10s–120s)
//     Format accepté par Bunny : valeur numérique en secondes
//   - Fallback Drive : seek aléatoire via loadedmetadata
// Fade : thumbnail visible → fade out 800ms quand vidéo prête → vidéo fade in

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Play, Plus, Check, ThumbsUp, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { VideoFile } from "@/lib/drive";
import { VideoCard } from "./VideoCard";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { useTV } from "@/lib/tv-client";
import { formatDuration, formatSize } from "@/lib/format";

interface InfoModalProps {
  video: VideoFile;
  related: VideoFile[];
  userEmail?: string | null;
  onClose: () => void;
}

const DRAG_CLOSE_THRESHOLD = 120;
const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;

export function InfoModal({ video, related, userEmail, onClose }: InfoModalProps) {
  const isTV = useTV();
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [shouldMountVideo, setShouldMountVideo] = useState(false);
  const [fav, setFav] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const router = useRouter();

  const hasBunny = !!video.bunnyId && !!BUNNY_LIBRARY_ID;

  // Démarrage aléatoire entre 10s et 120s
  // Paramètre Bunny : ?t={seconds} (valeur numérique)
  const randomStart = useRef(Math.floor(Math.random() * 110) + 10);
  const bunnyEmbedUrl = hasBunny
    ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.bunnyId}?autoplay=true&muted=true&loop=true&preload=true&responsive=true&t=${randomStart.current}`
    : null;

  const thumbSrc = video.bunnyThumbnail ?? (video.thumbnailLink ? `/api/thumb/${video.id}` : null);

  useEffect(() => {
    if (isTV) {
      setVideoReady(true);
      return;
    }
    const t = setTimeout(() => setShouldMountVideo(true), 400);
    return () => clearTimeout(t);
  }, [isTV]);

  // Fade in vidéo après que isReady est true
  useEffect(() => {
    if (!videoReady) return;
    const t = setTimeout(() => setPreviewVisible(true), 300);
    return () => clearTimeout(t);
  }, [videoReady]);

  // Fallback Drive : fetch URL signée + seek aléatoire
  useEffect(() => {
    if (!shouldMountVideo || isTV || hasBunny) return;
    fetch(`/api/stream/${video.id}`)
      .then((r) => r.json())
      .then(({ url }) => {
        const v = videoRef.current;
        if (!v || !url) return;
        v.src = url;
        v.load();
        v.addEventListener("loadedmetadata", () => {
          const dur = v.duration;
          if (dur && dur > 30) {
            v.currentTime = Math.random() * Math.min(dur * 0.6, 120) + 10;
          }
        }, { once: true });
      })
      .catch(console.error);
  }, [shouldMountVideo, isTV, video.id, hasBunny]);

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
      ? `${video.videoMediaMetadata.width}\u00d7${video.videoMediaMetadata.height}`
      : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
    if (dragY > DRAG_CLOSE_THRESHOLD) onClose();
    else setDragY(0);
    dragStartY.current = null;
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
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

            {/* Thumbnail — se cache en fondu quand la vidéo démarre */}
            {thumbSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbSrc}
                alt={cleanName}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: previewVisible ? 0 : 1, transition: "opacity 800ms ease" }}
              />
            )}

            {/* Bunny embed — démarre à randomStart secondes */}
            {shouldMountVideo && !isTV && hasBunny && (
              <iframe
                src={bunnyEmbedUrl!}
                className="absolute inset-0 w-full h-full"
                style={{ border: "none", opacity: previewVisible ? 1 : 0, transition: "opacity 800ms ease" }}
                allow="autoplay; fullscreen"
                allowFullScreen
                loading="lazy"
                onLoad={() => setVideoReady(true)}
                title={cleanName}
              />
            )}

            {/* Fallback Drive */}
            {shouldMountVideo && !isTV && !hasBunny && (
              <video
                ref={videoRef}
                autoPlay
                muted={muted}
                loop
                playsInline
                preload="metadata"
                poster={thumbSrc ?? undefined}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: previewVisible ? 1 : 0, transition: "opacity 800ms ease" }}
                onCanPlay={() => setVideoReady(true)}
              />
            )}

            {!videoReady && !isTV && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />

            <button
              onClick={onClose}
              data-tv-close
              data-focusable
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {!isTV && !hasBunny && (
              <button
                onClick={() => setMuted((m) => !m)}
                className="absolute bottom-6 right-6 z-20 w-10 h-10 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition-colors"
                aria-label={muted ? "Activer le son" : "Couper le son"}
              >
                {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
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
                  className="flex items-center gap-2 bg-white text-black font-bold px-7 py-2.5 rounded hover:bg-zinc-200 transition-colors"
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                  Lecture
                </button>
                <button
                  data-focusable
                  onClick={onToggleFav}
                  disabled={!userEmail}
                  className="w-11 h-11 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition-colors disabled:opacity-50"
                  aria-label={fav ? "Retirer de ma liste" : "Ajouter \u00e0 ma liste"}
                >
                  {fav ? <Check className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                </button>
                <button
                  data-focusable
                  className="w-11 h-11 rounded-full border-2 border-zinc-500 bg-zinc-900/60 hover:border-white flex items-center justify-center transition-colors"
                  aria-label="J'aime"
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
                  {duration && <span className="text-green-500 font-semibold">{duration}</span>}
                  {resolution && <span className="text-zinc-400">{resolution}</span>}
                  {size && <span className="text-zinc-400">{size}</span>}
                  <span className="px-1.5 border border-zinc-600 rounded text-xs text-zinc-300">HD</span>
                </div>
                {video.description ? (
                  <p className="text-zinc-200 leading-relaxed whitespace-pre-line">{video.description}</p>
                ) : (
                  <p className="text-zinc-400 italic">Aucune description disponible.</p>
                )}
              </div>
              <aside className="text-sm space-y-2">
                {video.category && (
                  <p><span className="text-zinc-500">Cat\u00e9gorie\u00a0: </span><span className="text-zinc-200">{video.category}</span></p>
                )}
                {video.modifiedTime && (
                  <p><span className="text-zinc-500">Ajout\u00e9 le\u00a0: </span><span className="text-zinc-200">
                    {new Date(video.modifiedTime).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </span></p>
                )}
                <p><span className="text-zinc-500">Format\u00a0: </span><span className="text-zinc-200">{video.mimeType.replace("video/", "").toUpperCase()}</span></p>
              </aside>
            </div>

            {related.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Autres vid\u00e9os similaires</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {related.slice(0, 6).map((v) => <VideoCard key={v.id} video={v} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
