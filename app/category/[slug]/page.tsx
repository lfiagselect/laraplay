// LARAPLAY — Page catégorie unique. Bandeau hero + grille vidéos filtrées.

import { Header } from "@/components/Header";
import { CategoryFilters } from "@/components/CategoryFilters";
import { getCatalog, ERAS, THEMATIC_ROWS, unslugify } from "@/lib/catalog";
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

  const videos = catalog.byCategory.get(categoryName) ?? [];
  const heroImage = landscapeImage(categoryName, "png");

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute top-0 left-0 right-0 z-30">
        <Header />
      </div>

      <section className="relative w-full overflow-hidden bg-black">
        {heroImage ? (
          <div className="relative w-full aspect-video max-h-[60vh] mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={categoryName}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-[40vh] min-h-[280px] flex items-end px-4 md:px-12 pb-8 bg-gradient-to-br from-zinc-900 to-black">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg">
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
