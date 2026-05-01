// LARAPLAY — Filtres + tri sur grille catégorie.

"use client";

import { useMemo, useState } from "react";
import type { VideoFile } from "@/lib/drive";
import { VideoCard } from "./VideoCard";
import { ArrowDownAZ, Calendar, Clock, HardDrive } from "lucide-react";

type SortKey = "date" | "alpha" | "duration" | "size";
type DurationFilter = "all" | "short" | "medium" | "long" | "xlong";

interface CategoryFiltersProps {
  videos: VideoFile[];
}

const DURATION_BUCKETS: Record<DurationFilter, (sec: number) => boolean> = {
  all: () => true,
  short: (s) => s < 600, // < 10 min
  medium: (s) => s >= 600 && s < 1800, // 10-30 min
  long: (s) => s >= 1800 && s < 3600, // 30-60 min
  xlong: (s) => s >= 3600, // > 1h
};

const DURATION_LABELS: Record<DurationFilter, string> = {
  all: "Toutes",
  short: "< 10 min",
  medium: "10–30 min",
  long: "30–60 min",
  xlong: "> 1h",
};

const SORT_LABELS: Record<SortKey, { label: string; Icon: typeof Calendar }> = {
  date: { label: "Plus récent", Icon: Calendar },
  alpha: { label: "Alphabétique", Icon: ArrowDownAZ },
  duration: { label: "Durée", Icon: Clock },
  size: { label: "Taille", Icon: HardDrive },
};

function durationSec(v: VideoFile): number {
  const ms = v.videoMediaMetadata?.durationMillis;
  return ms ? Math.floor(Number(ms) / 1000) : 0;
}

export function CategoryFilters({ videos }: CategoryFiltersProps) {
  const [sort, setSort] = useState<SortKey>("date");
  const [filter, setFilter] = useState<DurationFilter>("all");

  const filtered = useMemo(() => {
    const fn = DURATION_BUCKETS[filter];
    let list = videos.filter((v) => fn(durationSec(v)));

    switch (sort) {
      case "date":
        list = [...list].sort((a, b) =>
          (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? "")
        );
        break;
      case "alpha":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "duration":
        list = [...list].sort((a, b) => durationSec(b) - durationSec(a));
        break;
      case "size":
        list = [...list].sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
        break;
    }

    return list;
  }, [videos, sort, filter]);

  return (
    <>
      <div className="flex flex-col gap-3 mb-6">
        {/* Tri */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-zinc-500 mr-1 w-12">
            Tri
          </span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => {
            const { label, Icon } = SORT_LABELS[k];
            const active = sort === k;
            return (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                  active
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Filtre durée */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-zinc-500 mr-1 w-12">
            Durée
          </span>
          {(Object.keys(DURATION_LABELS) as DurationFilter[]).map((k) => {
            const active = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  active
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {DURATION_LABELS[k]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        {filtered.length} vidéo{filtered.length > 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="text-zinc-500">Aucune vidéo ne correspond aux filtres.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </>
  );
}
