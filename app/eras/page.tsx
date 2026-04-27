// LARAPLAY — Page index ères chronologiques. Titre incrusté dans poster.

import { Header } from "@/components/Header";
import Link from "next/link";
import { getCatalog, slugify, ERAS } from "@/lib/catalog";
import { posterImage } from "@/lib/category-images";

export const dynamic = "force-dynamic";

export default async function ErasPage() {
  const catalog = await getCatalog();
  const eras = ERAS.map((name) => ({
    name,
    count: catalog.byCategory.get(name)?.length ?? 0,
    image: posterImage(name, "png"),
  }));

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Choisissez votre ère
        </h1>
        <p className="text-zinc-400 mb-8">
          La discographie chronologique de Lara Fabian
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {eras.map((era) => (
            <Link
              key={era.name}
              href={`/category/${slugify(era.name)}`}
              className="era-card relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-zinc-800 bg-zinc-900"
              aria-label={era.name}
            >
              {era.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={era.image}
                  alt={era.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black flex items-center justify-center text-white font-bold p-4 text-center">
                  {era.name}
                </div>
              )}
              <span className="absolute top-2 right-2 z-10 text-[10px] text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded">
                {era.count}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
