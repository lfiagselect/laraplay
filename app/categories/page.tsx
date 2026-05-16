// LARAPLAY — Page index catégories thématiques.
// Titre incrusté sur vignette, police Bebas Neue style streaming premium.

import { Header } from "@/components/Header";
import Link from "next/link";
import { getCatalog, slugify, ERAS, categoryMatches } from "@/lib/catalog";
import { landscapeImage } from "@/lib/category-images";

export const revalidate = 3600;

export default async function CategoriesPage() {
  const catalog = await getCatalog();
  const cats = Array.from(catalog.byCategory.entries())
    .filter(([name]) => !ERAS.some((era) => categoryMatches(name, era)) && name !== "Racine")
    .map(([name, videos]) => ({
      name,
      count: videos.length,
      image: landscapeImage(name, "webp"),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
          Catégories
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {cats.map((c) => (
            <Link
              key={c.name}
              href={`/category/${slugify(c.name)}`}
              className="era-card group relative aspect-video rounded-lg overflow-hidden bg-[var(--bg-elevated)] shadow-lg"
              aria-label={c.name}
            >
              {c.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image}
                    alt={c.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 z-10">
                <h2 className="era-title text-white drop-shadow-2xl">
                  {c.name}
                </h2>
                <p className="text-xs md:text-sm text-zinc-300 mt-1 font-medium">
                  {c.count} vidéo{c.count > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
