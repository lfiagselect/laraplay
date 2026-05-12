// LARAPLAY — Provider client qui installe spatial-nav global.
// Mount-only: le hook gère idempotence et SPA persistence.
// + Purge DOM TV: supprime physiquement tous boutons décoratifs pointer-only
//   (flèches scroll Row, son Hero) qui causent des bugs focus D-pad.

"use client";

import { useEffect } from "react";
import { useSpatialNav } from "@/lib/spatial-nav";

const PURGE_SELECTORS = [
  'button[aria-label="Précédent"]',
  'button[aria-label="Suivant"]',
  'button[aria-label*="son" i]', // bouton mute Hero — non utile TV
  'button[aria-hidden="true"]',
  "button[data-no-focus]",
];

function purgeDecorativeButtons() {
  if (typeof document === "undefined") return;
  if (!document.documentElement.classList.contains("tv")) return;
  const nodes = document.querySelectorAll<HTMLElement>(PURGE_SELECTORS.join(","));
  nodes.forEach((el) => {
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("tabindex", "-1");
    // Si parent ne stocke pas l'élément, on peut directement remove.
    // Mais certains composants se re-render → remove dans MutationObserver.
    try { el.remove(); } catch {}
  });
}

export function TVNavProvider() {
  useSpatialNav();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.documentElement.classList.contains("tv")) return;

    // Purge initiale
    purgeDecorativeButtons();

    // Re-purge sur DOM changes (router navigation, modal mount, etc.)
    const mo = new MutationObserver(() => {
      purgeDecorativeButtons();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);

  return null;
}
