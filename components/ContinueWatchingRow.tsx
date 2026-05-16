// LARAPLAY — Rangée "Continuer à regarder"
// Lit IDs localStorage côté client, fetch metadata via API.

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { VideoFile } from "@/lib/drive";
import { getContinueWatching, removeEntry } from "@/lib/watch-progress";
import { useVideoModal } from "./ModalProvider";
import { useTV } from "@/lib/tv-client";
import { TVRowArrows } from "./TVRowArrows";

interface Entry {
  video: VideoFile;
  position: number;
  duration: number;
}

export function ContinueWatchingRow({ userEmail }: { userEmail: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { open } = useVideoModal();
  const isTV = useTV();

  const refresh = async () => {
    const wls = getContinueWatching(userEmail);
    if (wls.length === 0) {
      setEntries([]);
      return;
    }
    try {
      const res = await fetch("/api/videos-by-ids", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: wls.map((e) => e.videoId) }),
      });
      if (!res.ok) {
        setEntries([]);
        return;
      }
      const data = (await res.json()) as { videos: VideoFile[] };
      const byId = new Map(data.videos.map((v) => [v.id, v]));
      const items: Entry[] = wls
        .map((e) => {
          const v = byId.get(e.videoId);
          if (!v) return null;
          return { video: v, position: e.position, duration: e.duration };
        })
        .filter((x): x is Entry => x !== null);
      setEntries(items);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    setHydrated(true);
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  if (!hydrated || entries.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section data-tv-section="continue" className="relative group/row mb-12">
      <div className="px-4 md:px-12 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Continuer à regarder
        </h2>
      </div>

      <div className="relative">
        {!isTV && (
          <button
            onClick={() => scroll("left")}
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition"
            aria-label="Précédent"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        <div
          ref={scrollRef}
          data-row-scroller
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 md:px-12 py-4"
        >
          {entries.map(({ video, position, duration }) => {
            const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
            const thumb = video.thumbnailLink ? `/api/thumb/${video.id}` : null;
            const pct = Math.min(100, Math.max(0, (position / duration) * 100));
            const remaining = Math.max(0, Math.floor((duration - position) / 60));

            return (
              <div
                key={video.id}
                className="video-card group block w-[260px] md:w-[300px] shrink-0 rounded-md overflow-hidden bg-zinc-900 relative"
              >
                <button
                  type="button"
                  data-focusable
                  data-tv-row-item
                  onClick={() => open(video.id)}
                  className="block w-full text-left"
                >
                  <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={cleanName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-zinc-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Play className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700/80">
                      <div className="h-full bg-red-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-tight">
                      {cleanName}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {remaining > 0 ? `${remaining} min restantes` : "Bientôt fini"}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEntry(userEmail, video.id);
                    refresh();
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                  aria-label="Retirer de la liste"
                  title="Retirer"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            );
          })}
        </div>

        <TVRowArrows scrollRef={scrollRef} />

        {!isTV && (
          <button
            onClick={() => scroll("right")}
            tabIndex={-1}
            data-no-focus
            aria-hidden="true"
            className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition"
            aria-label="Suivant"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </section>
  );
}
