// LARAPLAY — Provider client qui installe spatial-nav global.
// V3: drop purgeDecorativeButtons (el.remove() cassait reconciliation React →
//     NotFoundError removeChild). Render conditional !isTV côté composants
//     (Row, Top10Row, EraRow, HeroCarousel, ContinueWatchingRow) suffit pour
//     retirer boutons décoratifs du DOM TV sans toucher au DOM React.

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { focusInitial, installSpatialNav, uninstallSpatialNav } from "@/lib/spatial-nav";
import { detectTVClient } from "@/lib/tv-client";

export function TVNavProvider() {
  const pathname = usePathname();

  // Détecte avant d'installer le listener global : desktop/mobile n'en ont pas
  // besoin. La même passe couvre les UA TV détectées seulement côté client.
  useEffect(() => {
    if (!detectTVClient()) return;
    document.documentElement.classList.add("tv");
    installSpatialNav();
    return () => uninstallSpatialNav();
  }, []);

  // Après une navigation Next, l'ancien élément focalisé peut avoir disparu.
  useEffect(() => {
    if (!document.documentElement.classList.contains("tv")) return;
    const timer = window.setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body || !document.contains(active)) focusInitial();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
