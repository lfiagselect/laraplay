// LARAPLAY — Provider client qui installe spatial-nav global.
// V3: drop purgeDecorativeButtons (el.remove() cassait reconciliation React →
//     NotFoundError removeChild). Render conditional !isTV côté composants
//     (Row, Top10Row, EraRow, HeroCarousel, ContinueWatchingRow) suffit pour
//     retirer boutons décoratifs du DOM TV sans toucher au DOM React.

"use client";

import { useEffect } from "react";
import { useSpatialNav } from "@/lib/spatial-nav";
import { detectTVClient } from "@/lib/tv-client";

export function TVNavProvider() {
  useSpatialNav();

  // Appose classe html.tv si client-side détection OU override ?tv=1 actif
  // (cas où server-side UA n'a pas matché: Amazon Silk, browsers customisés, etc.)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (detectTVClient()) {
      document.documentElement.classList.add("tv");
    }
  }, []);

  return null;
}
