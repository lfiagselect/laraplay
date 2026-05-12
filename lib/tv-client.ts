// LARAPLAY — TV client-only (hook useTV + détection runtime).
// Override possible via ?tv=1 URL param ou localStorage "force_tv" = "1".
// Désactivable via ?tv=0.
"use client";

import { useEffect, useState } from "react";
import { TV_UA_REGEX } from "./tv";

const STORAGE_KEY = "laraplay_force_tv";

export function detectTVClient(): boolean {
  if (typeof window === "undefined") return false;

  // Override URL param
  try {
    const params = new URLSearchParams(window.location.search);
    const tvParam = params.get("tv");
    if (tvParam === "1") {
      localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    if (tvParam === "0") {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    // Persistance override entre navigations
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch {
    // localStorage indisponible (private mode) — continue détection auto
  }

  // Classe TV déjà appliquée par layout server (UA match)
  if (document.documentElement.classList.contains("tv")) return true;
  // UA regex côté client (filet de sécurité)
  if (TV_UA_REGEX.test(navigator.userAgent)) return true;

  // Heuristique: pas de hover + grande taille + screen.width = innerWidth (vrai TV plein écran)
  try {
    const noHover = window.matchMedia("(hover: none)").matches;
    const bigScreen = window.innerWidth >= 1280 && window.innerHeight >= 720;
    const isFullScreen = window.screen.width === window.innerWidth;
    return noHover && bigScreen && isFullScreen;
  } catch {
    return false;
  }
}

export function useTV(): boolean {
  const [isTV, setIsTV] = useState(false);
  useEffect(() => {
    setIsTV(detectTVClient());
  }, []);
  return isTV;
}
