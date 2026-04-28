// LARAPLAY — Page accueil

import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { EraRow } from "@/components/EraRow";
import { Top10Row } from "@/components/Top10Row";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { SplashIntro } from "@/components/SplashIntro";
import { getCatalog, ERAS, THEMATIC_ROWS, slugify } from "@/lib/catalog";
import { landscapeImage, posterImage } from "@/lib/category-images";
import { ERAS as ERAS_LIST } from "@/lib/catalog-meta";
import { auth } from "@/auth";

export const revalidate = 3600;

export default async function Home() {
  const [catalog, session] = await Promise.all([getCatalog(), auth()]);
  const userEmail = session?.user?.email ?? null;

  const eras = ERAS.map((name) => ({
    name,
    count: catalog.byCategory.get(name)?.length ?? 0,
    image: posterImage(name, "png"),
  })).filter((e) => e.count > 0);

  return (
    <div className="min-h-screen bg-black">
      <SplashIntro />
      <div className="absolute top-0 left-0 right-0 z-30">
        <Header />
      </div>

      {catalog.hero && (
        <Hero
          video={catalog.hero}
          backgroundImage={(() => {
            const cat = catalog.hero.category;
            if (!cat) return null;
            const isEra = ERAS_LIST.includes(cat);
            return isEra ? posterImage(cat, "png") : landscapeImage(cat, "png");
          })()}
        />
      )}

      <main className="relative -mt-24 pb-24">
        {userEmail && <ContinueWatchingRow userEmail={userEmail} />}

        {catalog.recents.length > 0 && (
          <Top10Row
            title="Top 10 sur LARAPLAY aujourd'hui"
            videos={catalog.recents}
          />
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
            />
          );
        })}
      </main>
    </div>
  );
}
