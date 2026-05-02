// LARAPLAY — Page lecture vidéo
// Player + métadonnées + vidéos similaires (même catégorie).
// Lookup catalog.byId (cache 1h) — drop getVideo cold call.

import { Header } from "@/components/Header";
import { Row } from "@/components/Row";
import { Player } from "@/components/Player";
import { getVideo } from "@/lib/drive";
import { getCatalog } from "@/lib/catalog";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import type { VideoFile } from "@/lib/drive";

export const revalidate = 3600;

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

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [catalog, session] = await Promise.all([getCatalog(), auth()]);

  let video: VideoFile | null = catalog.byId.get(id) ?? null;
  if (!video) {
    video = await getVideo(id);
  }
  if (!video) notFound();

  const userEmail = session?.user?.email;
  const cleanName = video.name.replace(/\.(mp4|mov|mkv|webm|avi)$/i, "");
  const duration = formatDuration(video.videoMediaMetadata?.durationMillis);
  const size = formatSize(video.size);
  const resolution =
    video.videoMediaMetadata?.width && video.videoMediaMetadata?.height
      ? `${video.videoMediaMetadata.width}×${video.videoMediaMetadata.height}`
      : null;

  const related = video.category
    ? (catalog.byCategory.get(video.category) ?? [])
        .filter((v) => v.id !== video.id)
        .slice(0, 20)
    : [];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6 shadow-2xl">
          <Player
            src={`/api/stream/${video.id}`}
            poster={video.thumbnailLink ? `/api/thumb/${video.id}` : undefined}
            videoId={video.id}
            userEmail={userEmail}
            className="w-full h-full"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {cleanName}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-zinc-400 mb-4">
              {video.category && (
                <span className="px-3 py-1 bg-zinc-800 rounded-full">
                  {video.category}
                </span>
              )}
              {duration && <span>· {duration}</span>}
              {resolution && <span>· {resolution}</span>}
              {size && <span>· {size}</span>}
            </div>
            {video.description && (
              <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                {video.description}
              </p>
            )}
          </div>

          <aside className="text-sm text-zinc-400 space-y-2">
            {video.modifiedTime && (
              <p>
                <span className="text-zinc-500">Ajouté le </span>
                {new Date(video.modifiedTime).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            <p>
              <span className="text-zinc-500">Format </span>
              {video.mimeType.replace("video/", "").toUpperCase()}
            </p>
          </aside>
        </div>

        {related.length > 0 && (
          <Row title={`Autres vidéos · ${video.category}`} videos={related} />
        )}
      </main>
    </div>
  );
}
