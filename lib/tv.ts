// LARAPLAY — Détection TV / 10-foot UI.
// Hybride: UA server-side (Tizen, webOS, Fire TV, Chromecast, AppleTV…)
//        + media query client (pointer:coarse + hover:none + viewport ≥1280)
// Server: detectTVServer(ua) lit headers UA dans RootLayout → html.tv class.
// Client: useTV() hook lit className puis fallback détection runtime.
// Aucune dep externe, zéro impact bundle desktop/mobile.

"use client";

import { useEffect, useState } from "react";

/** UA patterns connus pour TVs / streaming devices / set-top boxes. */
const TV_UA_REGEX =
  /Tizen|Web0S|webOS|AFT[A-Z]|CrKey|Chromecast|AppleTV|GoogleTV|SMART-TV|SmartTV|HbbTV|NetCast|VIERA|BRAVIA|DTV|POV_TV|PhilipsTV|Roku|Xbox|PlayStation|NintendoBrowser/i;

/**
 * Détection serveur via User-Agent header.
 * Appelée dans RootLayout pour pré-rendre html.tv côté server (évite flash).
 */
export function detectTVServer(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return TV_UA_REGEX.test(userAgent);
}

/**
 * Détection client runtime.
 * Priorité: className server-side > UA navigator > media query viewport.
 */
export function detectTVClient(): boolean {
  if (typeof window === "undefined") return false;
  // 1. Server-side decision wins (RootLayout a déjà ajouté classe)
  if (document.documentElement.classList.contains("tv")) return true;

  // 2. UA navigateur
  if (TV_UA_REGEX.test(navigator.userAgent)) return true;

  // 3. Heuristique viewport: pas de hover + grand écran + dpr=1 typique TV
  try {
    const noHover = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const bigScreen = window.innerWidth >= 1280 && window.innerHeight >= 720;
    const dprOne = window.devicePixelRatio === 1;
    return noHover && bigScreen && dprOne;
  } catch {
    return false;
  }
}

/**
 * Hook React: retourne true si client tourne sur TV.
 * Stable après mount (évite hydration mismatch).
 */
export function useTV(): boolean {
  const [isTV, setIsTV] = useState(false);
  useEffect(() => {
    setIsTV(detectTVClient());
  }, []);
  return isTV;
}

/** Keycodes télécommandes TV (superset Tizen/webOS/Fire TV/Apple TV). */
export const TV_KEYS = {
  UP: ["ArrowUp"],
  DOWN: ["ArrowDown"],
  LEFT: ["ArrowLeft"],
  RIGHT: ["ArrowRight"],
  ENTER: ["Enter", " "], // OK + Space
  BACK: ["Backspace", "Escape", "GoBack", "BrowserBack", "XF86Back"],
  PLAY: ["MediaPlayPause", "MediaPlay", "Play"],
  PAUSE: ["MediaPause", "Pause"],
  STOP: ["MediaStop", "Stop"],
  REWIND: ["MediaRewind"],
  FORWARD: ["MediaFastForward"],
} as const;

export type TVKeyAction = keyof typeof TV_KEYS;

/** Match KeyboardEvent.key contre groupe TV_KEYS. */
export function matchTVKey(key: string, action: TVKeyAction): boolean {
  return (TV_KEYS[action] as readonly string[]).includes(key);
}
