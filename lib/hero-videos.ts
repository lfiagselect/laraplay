// LARAPLAY — Config vidéos hero accueil
// Liste des teasers vidéo background. À étendre quand nouvelles vidéos ajoutées.

export interface HeroVideo {
  /** Identifiant unique (pour cycle sélection) */
  id: string;
  /** Chemin vidéo dans /public */
  src: string;
  /** Image fallback pendant chargement (ratio 16:9 recommandé) */
  poster: string;
  /** Mini-tag au-dessus du titre (ex: "L'EFFET LARA") */
  tag?: string;
  /** Titre principal */
  title: string;
  /** Sous-titre / descriptif court */
  subtitle?: string;
  /** Lien bouton "Lecture" (page catégorie ou vidéo) */
  ctaLecture: string;
  /** ID vidéo Drive pour bouton "Plus d'infos" (ouvre modal). Optionnel. */
  ctaInfoVideoId?: string;
}

export const HERO_VIDEOS: HeroVideo[] = [
  {
    id: "leffetlara",
    src: "/hero-videos/leffetlara.mp4",
    poster: "/hero-videos/leffetlara-poster.jpg",
    tag: "L'EFFET LARA",
    title: "L'Effet Lara",
    subtitle: "L'événement 2026",
    ctaLecture: "/category/leffet-lara-2026",
  },
];

/**
 * Slides carrousel mobile (remplace vidéo hero sur smartphone — économie data).
 * Image landscape 16:9. Clic → page catégorie associée.
 */
export interface HeroCarouselSlideConfig {
  image: string;
  alt: string;
  href: string;
}

export const HERO_CAROUSEL_SLIDES: HeroCarouselSlideConfig[] = [
  {
    image: "/hero-fallback/leffet-lara.webp",
    alt: "L'Effet Lara - 2026",
    href: "/category/leffet-lara-2026",
  },
  {
    image: "/hero-fallback/concerts.webp",
    alt: "Lara Fabian - Concerts",
    href: "/category/lara-fabian-concerts",
  },
  {
    image: "/hero-fallback/documentaires.webp",
    alt: "Lara Fabian Documentaires",
    href: "/category/lara-fabian-documentaires",
  },
  {
    image: "/hero-fallback/the-voice.webp",
    alt: "The Voice 2026",
    href: "/category/the-voice-2026",
  },
];
