// LARAPLAY — Client side Ma liste. Lit IDs localStorage, fetch via API.

"use client";

import { useEffect, useState } from "react";
import type { VideoFile } from "@/lib/drive";
import { loadFavorites } from "@/lib/favorites";
import { VideoCard } from "./VideoCard";

interface MyListClientProps {
  userEmail: string | null;
}

export function MyListClient({ userEmail }: MyListClientProps) {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!userEmail) return;
    const ids = loadFavorites(userEmail);
    if (ids.length === 0) {
      setVideos([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/videos-by-ids", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        setVideos([]);
        return;
      }
      const data = (await res.json()) as { videos: VideoFile[] };
      // Préserve ordre IDs (= ordre ajout favoris)
      const byId = new Map(data.videos.map((v) => [v.id, v]));
      const ordered = ids
        .map((id) => byId.get(id))
        .filter((v): v is VideoFile => !!v);
      setVideos(ordered);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
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

  if (!hydrated) return null;

  if (!userEmail) {
    return (
      <p className="text-zinc-500">Tu dois être connecté pour voir ta liste.</p>
    );
  }

  if (loading && videos.length === 0) {
    return <p className="text-zinc-500">Chargement…</p>;
  }

  if (videos.length === 0) {
    return (
      <div className="border-2 border-dashed border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-zinc-300 text-lg mb-2">Ta liste est vide</p>
        <p className="text-zinc-500 text-sm">
          Clique sur le bouton <span className="font-bold">+</span> dans le détail
          d&apos;une vidéo pour l&apos;ajouter à ta liste.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
