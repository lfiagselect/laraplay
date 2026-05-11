// LARAPLAY — Mapping catégorie → vignette
// Vignettes situées dans public/categories/categories-v2/ (paysage 16:9)
// et public/categories/categories-v2-poster/ (portrait 3:4).
// Format webp prioritaire (léger), png fallback.

const LANDSCAPE_DIR = "/categories/categories-v2";
const POSTER_DIR = "/categories/categories-v2-poster";

/**
 * Map: nom catégorie exact (issu Drive) → nom fichier sans extension.
 * Conservation des noms encodés pour matcher fichiers réels.
 */
const FILE_BY_CATEGORY: Record<string, string> = {
  // Ères
  "1985 - 1990 Les débuts": "1985_-_1990_Les_dbuts",
  "1991 - 1993 Lara Fabian (Français)": "1991_-_1993_Lara_Fabian_Franais",
  "1994 - 1995 Carpe Diem": "1994_-_1995_Carpe_Diem",
  "1996 - 1999 Pure": "1996_-_1999_Pure",
  "1999 -2001 Lara Fabian (Anglais)": "1999_-2001_Lara_Fabian_Anglais",
  "2001 - 2003 Nue & ETI": "2001_-_2003_Nue__ETI",
  "2004 A Wonderful Life": "2004_A_Wonderful_Life",
  "2005 - 2008 9": "2005_-_2008_9",
  "2009 - 2010 TLFM & EWIM": "2009_-_2010_TLFM__EWIM",
  "2010 - 2012 Mademoiselle Zhivago": "2010_-_2012_Mademoiselle_Zhivago",
  "2013 - 2014 Le Secret": "2013_-_2014_Le_Secret",
  "2015 - 2016 Ma Vie dans La Tienne": "2015_-_2016_Ma_Vie_dans_La_Tienne",
  "2017 - 2018 Camouflage": "2017_-_2018_Camouflage",
  "2019 - 2021 Papillon": "2019_-_2021_Papillon",
  "2024 - Aujourd’hui": "2024_-_Aujourdhui",

  // Thématiques
  "L'Effet Lara - 2026": "LEffet_Lara_-_2026",
  "Lara Fabian - Concerts": "Lara_Fabian_-_Concerts",
  "Lara Fabian Documentaires": "Lara_Fabian_Documentaires",
  "Lara Fabian au Cinéma": "Lara_Fabian_au_Cinma",
  "The Voice 2026": "The_Voice_2026",
  "La Voix - Saison 6": "La_Voix_-_Saison_6",
  "Star Academie 2025": "Star_Acadmie_2025",
  "Star Academy France": "Star_Acadmie_2025", // fallback temporaire — pas de vignette dédiée
  "The Voice Kids 2024": "The_Voice_Kids_2024",
  "Lara Fabian aux Enfoirés": "Lara_Fabian_aux_Enfoirs",
  "Lara Fabian - Divers": "Lara_Fabian_-_Divers",
  "Lara Fabian - Livres": "Lara_Fabian_-_Livres",
};

/**
 * Format image:
 * - "webp" (default): léger ~50ko, parfait pour cartes/listes
 * - "png": haute résolution ~800ko, pour bandeau hero (1 seule image, qualité max)
 */
export function landscapeImage(
  category: string,
  format: "webp" | "png" = "webp"
): string | null {
  const file = FILE_BY_CATEGORY[category];
  if (!file) return null;
  return `${LANDSCAPE_DIR}/${file}.${format}`;
}

export function posterImage(
  category: string,
  format: "webp" | "png" = "webp"
): string | null {
  const file = FILE_BY_CATEGORY[category];
  if (!file) return null;
  return `${POSTER_DIR}/${file}.${format}`;
}
