// LARAPLAY — Page index catégories thématiques. Titre incrusté dans landscape.

import { Header } from "@/components/Header";
import Link from "next/link";
import { getCatalog, slugify, ERAS } from "@/lib/catalog";
import { landscapeImage } from "@/lib/category-images";

export const revalidate = 3600;

export default async function CategoriesPage() {
  const catalog = await getCatalog();
  const eraSet = new Set(ERAS);

  const cats = Array.from(catalog.byCategory.entries())
    .filter(([name]) => !eraSet.has(name) && name !== "Racine")
    .map(([name, videos]) => ({
      name,
      count: videos.length,
      image: landscapeImage(name, "png"),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-black">
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
              className="era-card relative aspect-video rounded-lg overflow-hidden border-2 border-zinc-800 bg-zinc-900"
              aria-label={c.name}
            >
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.image}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center text-white font-bold p-4 text-center">
                  {c.name}
                </div>
              )}
              <span className="absolute top-2 right-2 z-10 text-[10px] text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded">
                {c.count} vidéo{c.count > 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
