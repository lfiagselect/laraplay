// LARAPLAY — Constantes + helpers purs (pas de dépendance googleapis).
// Utilisable côté client ET serveur.

export const THEMATIC_ROWS: string[] = [
  "L'Effet Lara - 2026",
  "Lara Fabian - Concerts",
  "Lara Fabian Documentaires",
  "Lara Fabian au Cinéma",
  "The Voice 2026",
  "Star Academie 2025",
  "Star Academy France",
  "The Voice Kids 2024",
  "Lara Fabian aux Enfoirés",
  "Lara Fabian - Divers",
  "Lara Fabian - Livres",
];

export const ERAS: string[] = [
  "1985 - 1990 Les débuts",
  "1991 - 1993 Lara Fabian (Français)",
  "1994 - 1995 Carpe Diem",
  "1996 - 1999 Pure",
  "1999 -2001 Lara Fabian (Anglais)",
  "2001 - 2003 Nue & ETI",
  "2004 A Wonderful Life",
  "2005 - 2008 9",
  "2009 - 2010 TLFM & EWIM",
  "2010 - 2012 Mademoiselle Zhivago",
  "2013 - 2014 Le Secret",
  "2015 - 2016 Ma Vie dans La Tienne",
  "2017 - 2018 Camouflage",
  "2019 - 2021 Papillon",
  "2024 - Aujourd’hui",
];

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function unslugify(slug: string, candidates: string[]): string | null {
  return candidates.find((c) => slugify(c) === slug) ?? null;
}
