// LARAPLAY — Page catégorie unique. Header sticky + bandeau hero sous + grille filtrée.

import { Header } from "@/components/Header";
import { CategoryFilters } from "@/components/CategoryFilters";
import { getCatalog, ERAS, THEMATIC_ROWS, categoryMatches, slugify, unslugify } from "@/lib/catalog";
import { landscapeImage } from "@/lib/category-images";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const candidates = [...ERAS, ...THEMATIC_ROWS, ...catalog.byCategory.keys()];
  const categoryName = unslugify(slug, candidates);
  if (!categoryName) notFound();

  const categorySlug = slugify(categoryName);
  const matchingCategoryName = [...catalog.byCategory.keys()].find(
    (name) => categoryMatches(name, categoryName) || slugify(name) === categorySlug
  );
  const videos = [...catalog.byCategory]
    .filter(([name]) => categoryMatches(name, categoryName) || slugify(name) === categorySlug)
    .flatMap(([, list]) => list);
  const heroImage = landscapeImage(matchingCategoryName ?? categoryName, "png");

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <section className="relative w-full overflow-hidden bg-black pt-16 md:pt-20">
        {heroImage ? (
          <div className="relative w-full aspect-video max-h-[60vh] mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={categoryName}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 px-4 md:px-12 pb-6 max-w-[1600px] mx-auto">
              <h1 className="era-title text-white drop-shadow-2xl text-3xl md:text-5xl">
                {categoryName}
              </h1>
              <p className="text-sm text-zinc-300 mt-2">
                {videos.length} vidéo{videos.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[40vh] min-h-[280px] flex items-end px-4 md:px-12 pb-8 bg-gradient-to-br from-zinc-900 to-black">
            <h1 className="era-title text-white drop-shadow-lg text-3xl md:text-5xl">
              {categoryName}
            </h1>
          </div>
        )}
      </section>

      <main className="max-w-[1600px] mx-auto px-4 md:px-12 py-8 relative z-10">
        {videos.length === 0 ? (
          <p className="text-zinc-500">Aucune vidéo dans cette catégorie.</p>
        ) : (
          <CategoryFilters videos={videos} />
        )}
      </main>
    </div>
  );
}
