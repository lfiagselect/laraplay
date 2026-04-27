// LARAPLAY — Page catégorie unique. Bandeau hero + grille vidéos.

import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { getCatalog, ERAS, THEMATIC_ROWS, unslugify } from "@/lib/catalog";
import { landscapeImage } from "@/lib/category-images";
import { notFound } from "next/navigation";

export const revalidate = 600;

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
  const heroImage = landscapeImage(categoryName, "png"); // PNG haute qualité pour bandeau
  const fallbackThumb = landscapeImage(categoryName); // WEBP léger pour cards

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute top-0 left-0 right-0 z-30">
        <Header />
      </div>

      {/* Bandeau hero catégorie. Image PNG haute qualité, ratio 16:9 préservé. */}
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
          <div className="h-[40vh] min-h-[280px] flex items-end px-4 md:px-8 pb-8 bg-gradient-to-br from-zinc-900 to-black">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg">
              {categoryName}
            </h1>
          </div>
        )}
        <div className="px-4 md:px-8 pb-4 max-w-[1600px] mx-auto">
          <p className="text-sm text-zinc-400">
            {videos.length} vidéo{videos.length > 1 ? "s" : ""}
          </p>
        </div>
      </section>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 -mt-8 relative z-10">
        {videos.length === 0 ? (
          <p className="text-zinc-500">Aucune vidéo dans cette catégorie.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} fallbackImage={fallbackThumb} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
