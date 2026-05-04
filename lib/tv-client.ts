// LARAPLAY — TV client-only (hook useTV + détection runtime).
"use client";

import { useEffect, useState } from "react";
import { TV_UA_REGEX } from "./tv";

export function detectTVClient(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("tv")) return true;
  if (TV_UA_REGEX.test(navigator.userAgent)) return true;
  try {
    const noHover = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const bigScreen = window.innerWidth >= 1280 && window.innerHeight >= 720;
    const dprOne = window.devicePixelRatio === 1;
    return noHover && bigScreen && dprOne;
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
