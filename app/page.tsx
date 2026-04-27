// LARAPLAY — Page accueil Netflix-clone

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { EraRow } from "@/components/EraRow";
import { getCatalog, ERAS, THEMATIC_ROWS, slugify } from "@/lib/catalog";
import { landscapeImage, posterImage } from "@/lib/category-images";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalog = await getCatalog();

  const eras = ERAS.map((name) => ({
    name,
    count: catalog.byCategory.get(name)?.length ?? 0,
    image: posterImage(name, "png"),
  })).filter((e) => e.count > 0);

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute top-0 left-0 right-0 z-30">
        <Header />
      </div>

      {catalog.hero && <Hero video={catalog.hero} />}

      <main className="relative -mt-20 pb-20">
        {catalog.recents.length > 0 && (
          <Row title="Nouveautés" videos={catalog.recents.slice(0, 12)} />
        )}

        {eras.length > 0 && <EraRow title="Choisissez votre ère" eras={eras} />}

        {THEMATIC_ROWS.map((cat) => {
          const vids = catalog.byCategory.get(cat) ?? [];
          if (vids.length === 0) return null;
          return (
            <Row
              key={cat}
              title={cat}
              videos={vids.slice(0, 20)}
              href={`/category/${slugify(cat)}`}
              categoryImage={landscapeImage(cat)}
            />
          );
        })}
      </main>
    </div>
  );
}
