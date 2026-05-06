// LARAPLAY — Page accueil. Séparateurs rouges entre rows.

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
import { getStreamUrl } from "@/lib/drive";
import { auth } from "@/auth";

export const revalidate = 3600;

function Divider() {
  return <hr className="row-divider" aria-hidden="true" />;
}

export default async function Home() {
  const [catalog, session] = await Promise.all([getCatalog(), auth()]);
  const userEmail = session?.user?.email ?? null;

  const eras = ERAS.map((name) => ({
    name,
    count: catalog.byCategory.get(name)?.length ?? 0,
    image: posterImage(name, "png"),
  })).filter((e) => e.count > 0);

  const hero = HERO_VIDEOS[0];

  // Pré-résolution URL signée server-side → zéro fetch client au mount
  const { url: heroSrc } = await getStreamUrl(hero.driveId);

  const heroCategory = "L'Effet Lara - 2026";
  const heroVideoForInfo = catalog.byCategory.get(heroCategory)?.[0]?.id;
  const heroFinal = heroVideoForInfo
    ? { ...hero, ctaInfoVideoId: heroVideoForInfo }
    : hero;

  const sections: React.ReactNode[] = [];
  if (userEmail) {
    sections.push(<ContinueWatchingRow key="continue" userEmail={userEmail} />);
  }
  if (catalog.recents.length > 0) {
    sections.push(
      <Top10Row key="top10" title="Top 10 sur LARAPLAY aujourd'hui" videos={catalog.recents} />
    );
  }
  if (eras.length > 0) {
    sections.push(<EraRow key="eras" title="Choisissez votre ère" eras={eras} />);
  }
  for (const cat of THEMATIC_ROWS) {
    const vids = catalog.byCategory.get(cat) ?? [];
    if (vids.length === 0) continue;
    sections.push(
      <Row
        key={cat}
        title={cat}
        videos={vids.slice(0, 20)}
        href={`/category/${slugify(cat)}`}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SplashIntro />
      <Header />

      <HeroResponsive hero={heroFinal} heroSrc={heroSrc} carouselSlides={HERO_CAROUSEL_SLIDES} />

      <main className="relative pt-10 md:pt-8 pb-24">
        {sections.map((section, i) => (
          <div key={i}>
            {section}
            {i < sections.length - 1 && <Divider />}
          </div>
        ))}
      </main>
    </div>
  );
}
