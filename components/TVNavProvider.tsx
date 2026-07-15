// LARAPLAY — Provider client qui installe spatial-nav global.
// V3: drop purgeDecorativeButtons (el.remove() cassait reconciliation React →
//     NotFoundError removeChild). Render conditional !isTV côté composants
//     (Row, Top10Row, EraRow, HeroCarousel, ContinueWatchingRow) suffit pour
//     retirer boutons décoratifs du DOM TV sans toucher au DOM React.

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { focusInitial, useSpatialNav } from "@/lib/spatial-nav";
import { detectTVClient } from "@/lib/tv-client";

export function TVNavProvider() {
  useSpatialNav();
  const pathname = usePathname();

  // Appose classe html.tv si client-side détection OU override ?tv=1 actif
  // (cas où server-side UA n'a pas matché: Amazon Silk, browsers customisés, etc.)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (detectTVClient()) {
      document.documentElement.classList.add("tv");
    }
  }, []);

  // Après une navigation Next, l'ancien élément focalisé peut avoir disparu.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!document.documentElement.classList.contains("tv")) return;
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body || !document.contains(active)) focusInitial();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
