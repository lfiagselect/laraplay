// LARAPLAY — Provider client qui installe spatial-nav global.
// Mount-only: le hook gère idempotence et SPA persistence.
// Skip noop si pas TV (le handler vérifie html.tv classlist à chaque event).

"use client";

import { useSpatialNav } from "@/lib/spatial-nav";

export function TVNavProvider() {
  useSpatialNav();
  return null;
}
