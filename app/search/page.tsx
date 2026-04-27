// LARAPLAY — Page recherche
// Filtre titre + catégorie. Server component, simple query string.

import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { getCatalog } from "@/lib/catalog";
import { Search as SearchIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const catalog = await getCatalog();
  const query = q.trim();

  const matches = query
    ? catalog.all.filter((v) => {
        const haystack = normalize(`${v.name} ${v.category ?? ""}`);
        return haystack.includes(normalize(query));
      })
    : [];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        <form action="/search" method="get" className="mb-8 max-w-2xl">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-red-600 transition">
            <SearchIcon className="w-5 h-5 ml-4 text-zinc-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Rechercher une vidéo, un concert, un album…"
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-zinc-500 outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 font-semibold transition"
            >
              Rechercher
            </button>
          </div>
        </form>

        {query ? (
          <>
            <p className="text-zinc-400 mb-6">
              {matches.length} résultat{matches.length > 1 ? "s" : ""} pour
              <span className="text-white font-semibold"> « {query} »</span>
            </p>
            {matches.length === 0 ? (
              <p className="text-zinc-500">Aucune vidéo ne correspond à ta recherche.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {matches.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-zinc-500">Lance une recherche pour explorer le catalogue.</p>
        )}
      </main>
    </div>
  );
}
