// LARAPLAY – Page accueil.

import { Header } from "@/components/Header";
import { HeroResponsive } from "@/components/HeroResponsive";
import { Row } from "@/components/Row";
import { EraRow } from "@/components/EraRow";
import { Top10Row } from "@/components/Top10Row";
import { RecentRow } from "@/components/RecentRow";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { SplashIntro } from "@/components/SplashIntro";
import { getCatalog, ERAS, THEMATIC_ROWS, categoryMatches, slugify } from "@/lib/catalog";
import { landscapeImage, posterImage } from "@/lib/category-images";
import { HERO_VIDEOS, HERO_CAROUSEL_SLIDES } from "@/lib/hero-videos";
import { auth } from "@/auth";
import { cookies, headers } from "next/headers";
import { detectTVServer } from "@/lib/tv";

export const revalidate = 3600;

// Deux écrans de cartes environ sur un téléviseur 1080p. Le lien de catégorie
// reste disponible pour parcourir le catalogue complet sans gonfler le DOM de
// l'accueil sur les moteurs WebOS/Tizen les moins puissants.
const TV_ROW_LIMIT = 12;

function Divider() {
  return <hr className="row-divider" aria-hidden="true" />;
}

function videosForCategory<T>(byCategory: Map<string, T[]>, category: string): T[] {
  const matches: T[] = [];
  for (const [name, videos] of byCategory) {
    if (categoryMatches(name, category)) matches.push(...videos);
  }
  return matches;
}

export default async function Home() {
  const [catalog, session, hdrs, cookieStore] = await Promise.all([
    getCatalog(),
    auth(),
    headers(),
    cookies(),
  ]);
  const userEmail = session?.user?.email ?? null;
  const isTV =
    detectTVServer(hdrs.get("user-agent")) ||
    cookieStore.get("laraplay_legacy_tv")?.value === "1";

  const eras = ERAS.map((name) => ({
    name,
    count: videosForCategory(catalog.byCategory, name).length,
    image: posterImage(name),
  })).filter((e) => e.count > 0);

  const hero = HERO_VIDEOS[0];
  const heroCategory = "L'Effet Lara - 2026";
  const heroVideoForInfo = catalog.byCategory.get(heroCategory)?.[0]?.id;
  const heroFinal = heroVideoForInfo
    ? { ...hero, ctaInfoVideoId: heroVideoForInfo }
    : hero;

  const sections: React.ReactNode[] = [];

  if (userEmail) {
    sections.push(<ContinueWatchingRow key="continue" userEmail={userEmail} />);
  }

  if (catalog.recentAdds.length > 0) {
    sections.push(
      <RecentRow key="recent" title="Ajouts récents" videos={catalog.recentAdds} />
    );
  }

  if (catalog.top10.length > 0) {
    sections.push(
      <Top10Row key="top10" title="Top 10 sur LARAPLAY aujourd'hui" videos={catalog.top10} />
    );
  }

  if (eras.length > 0) {
    sections.push(<EraRow key="eras" title="Choisissez votre ère" eras={eras} />);
  }

  for (const cat of THEMATIC_ROWS) {
    const vids = videosForCategory(catalog.byCategory, cat);
    if (vids.length === 0) continue;
    sections.push(
      <Row
        key={cat}
        title={cat}
        videos={vids.slice(0, isTV ? TV_ROW_LIMIT : 20)}
        href={`/category/${slugify(cat)}`}
        categoryImage={landscapeImage(cat)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SplashIntro />
      <Header />
      <HeroResponsive
        hero={heroFinal}
        carouselSlides={HERO_CAROUSEL_SLIDES}
        tvMode={isTV}
      />
      {/* Netflix: rows commencent SOUS hero avec overlap négatif (gradient hero couvre top rows) */}
      <main className="relative -mt-[6vh] md:-mt-[10vh] pb-24 z-10">
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
