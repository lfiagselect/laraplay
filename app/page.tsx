// LARAPLAY — Page accueil

import { Header } from "@/components/Header";
import { HeroResponsive } from "@/components/HeroResponsive";
import { Row } from "@/components/Row";
import { EraRow } from "@/components/EraRow";
import { Top10Row } from "@/components/Top10Row";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { SplashIntro } from "@/components/SplashIntro";
import { getCatalog, ERAS, THEMATIC_ROWS, slugify } from "@/lib/catalog";
import { posterImage } from "@/lib/category-images";
import { HERO_VIDEOS, HERO_CAROUSEL_SLIDES } from "@/lib/hero-videos";
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

  // Sélection hero — première dispo. Q2:c (fixe) tant qu'1 seule vidéo.
  // Si plusieurs hero ajoutées plus tard, possible faire rotation aléatoire ici.
  const hero = HERO_VIDEOS[0];

  // Bouton "Plus d'infos" → modal sur 1ère vidéo Drive de la catégorie liée
  const heroCategory = "L'Effet Lara - 2026";
  const heroVideoForInfo = catalog.byCategory.get(heroCategory)?.[0]?.id;
  const heroFinal = heroVideoForInfo
    ? { ...hero, ctaInfoVideoId: heroVideoForInfo }
    : hero;

  return (
    <div className="min-h-screen bg-black">
      <SplashIntro />
      {/* Header: absolute desktop (overlay sur hero vidéo), sticky mobile (au-dessus du carrousel) */}
      <div className="md:absolute md:top-0 md:left-0 md:right-0 md:z-30 sticky top-0 z-40">
        <Header />
      </div>

      <HeroResponsive
        hero={heroFinal}
        carouselSlides={HERO_CAROUSEL_SLIDES}
      />

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
