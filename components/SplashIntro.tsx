// LARAPLAY — Splash intro animée (style TUDUM original)
// Affichée 1× par session navigateur. Logo + son court + fade out.

"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "laraplay-splash-shown";
const DURATION_MS = 2400;

export function SplashIntro() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shown = sessionStorage.getItem(STORAGE_KEY);
    if (shown) {
      setVisible(false);
      return;
    }
    setVisible(true);
    sessionStorage.setItem(STORAGE_KEY, "1");

    // Son synthétisé Web Audio
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();

        // 2 oscillateurs : grave qui monte, aigu sustain
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(60, now);
        osc1.frequency.exponentialRampToValueAtTime(220, now + 0.6);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.35, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 1.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(440, now + 0.55);
        osc2.frequency.exponentialRampToValueAtTime(660, now + 1.4);
        gain2.gain.setValueAtTime(0, now + 0.55);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.65);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now + 0.55);
        osc2.stop(now + 1.9);
      }
    } catch {
      // user a coupé son ou Web Audio bloqué — pas grave
    }

    const timer = setTimeout(() => setVisible(false), DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (visible === null || visible === false) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-splash-fade pointer-events-auto"
      onClick={() => setVisible(false)}
      aria-hidden
    >
      <div className="relative">
        {/* Glow */}
        <div className="absolute inset-0 blur-3xl opacity-60 bg-red-600 animate-splash-glow rounded-full" />
        {/* Logo */}
        <h1 className="logo-wordmark relative text-7xl md:text-9xl uppercase animate-splash-zoom">
          LARAPLAY
        </h1>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute bottom-8 right-8 text-zinc-500 text-xs hover:text-white transition"
      >
        Passer
      </button>
    </div>
  );
}
