// LARAPLAY — Page recherche
// Filtre titre + catégorie. Server component, simple query string.

import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { getCatalog } from "@/lib/catalog";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";

export const revalidate = 3600;
const PAGE_SIZE = 40;
const MAX_QUERY_LENGTH = 120;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: rawPage } = await searchParams;
  const catalog = await getCatalog();
  const query = q.trim().slice(0, MAX_QUERY_LENGTH);
  const needle = normalize(query);

  const matches = needle
    ? catalog.all.filter((v) => {
        const haystack = normalize(`${v.name} ${v.category ?? ""}`);
        return haystack.includes(needle);
      })
    : [];
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(rawPage ?? "1", 10);
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageItems = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (target: number) =>
    `/search?q=${encodeURIComponent(query)}&page=${target}`;

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 pt-20 md:pt-24 pb-8">
        <form action="/search" method="get" data-tv-section="search-form" className="mb-8 max-w-2xl">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500 transition">
            <SearchIcon className="w-5 h-5 ml-4 text-zinc-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              maxLength={MAX_QUERY_LENGTH}
              enterKeyHint="search"
              aria-label="Rechercher dans le catalogue"
              placeholder="Rechercher une vidéo, un concert, un album…"
              className="flex-1 min-w-0 bg-transparent px-4 py-3 text-white placeholder-zinc-400 outline-none"
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
              {matches.length} résultat{matches.length !== 1 ? "s" : ""} pour
              <span className="text-white font-semibold"> « {query} »</span>
            </p>
            {matches.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
                <p className="text-zinc-300 mb-3">Aucune vidéo ne correspond à ta recherche.</p>
                <Link href="/categories" className="inline-flex min-h-11 items-center text-white underline underline-offset-4">
                  Explorer les catégories
                </Link>
              </div>
            ) : (
              <>
                <div data-tv-section="search-results" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {pageItems.map((v) => (
                    <VideoCard key={v.id} video={v} layout="grid" />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav
                    data-tv-section="search-pagination"
                    aria-label="Pagination des résultats"
                    className="mt-10 grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-2 mx-auto"
                  >
                    {page > 1 ? (
                      <Link href={pageHref(page - 1)} className="min-h-11 px-3 rounded-lg bg-zinc-800 text-white inline-flex items-center justify-self-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        ← Précédent
                      </Link>
                    ) : <span />}
                    <span className="text-zinc-300" aria-current="page">Page {page} sur {totalPages}</span>
                    {page < totalPages ? (
                      <Link href={pageHref(page + 1)} className="min-h-11 px-3 rounded-lg bg-zinc-800 text-white inline-flex items-center justify-self-end focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        Suivant →
                      </Link>
                    ) : <span />}
                  </nav>
                )}
              </>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-zinc-300 mb-4">Lance une recherche ou explore directement le catalogue.</p>
            <div className="flex flex-wrap gap-3" data-tv-section="search-suggestions">
              <Link href="/categories" className="min-h-11 px-4 rounded-lg bg-zinc-800 text-white inline-flex items-center">Catégories</Link>
              <Link href="/eras" className="min-h-11 px-4 rounded-lg bg-zinc-800 text-white inline-flex items-center">Ères</Link>
              <Link href="/my-list" className="min-h-11 px-4 rounded-lg bg-zinc-800 text-white inline-flex items-center">Ma liste</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
