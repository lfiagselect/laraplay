// LARAPLAY — Config vidéos hero accueil
// Liste des teasers vidéo background. À étendre quand nouvelles vidéos ajoutées.

export interface HeroVideo {
  /** Identifiant unique (pour cycle sélection) */
  id: string;
  /** ID Bunny Stream de la vidéo hero */
  bunnyId: string;
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
  /** ID vidéo pour bouton "Plus d'infos" (ouvre modal). Optionnel. */
  ctaInfoVideoId?: string;
}

export const HERO_VIDEOS: HeroVideo[] = [
  {
    id: "leffetlara",
    bunnyId: "cdd25794-931f-4500-a166-3615c82ee51e",
    poster: "/hero-videos/leffetlara-poster.jpg",
    tag: "L'EFFET LARA",
    title: "L'Effet Lara",
    subtitle: "L'événement 2026",
    ctaLecture: "/category/l-effet-lara-2026",
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
    href: "/category/l-effet-lara-2026",
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