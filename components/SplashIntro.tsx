// LARAPLAY — Splash intro animée
// Affichée 1× par session. Logo + son court + fade out.

"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "laraplay-splash-shown";
const DURATION_MS = 4000;

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
    let ctx: AudioContext | null = null;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        ctx = new Ctx();

        // Resume context si suspended (Safari/iOS strict autoplay)
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;

        // Sub bass — sweep grave qui monte (impact)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(50, now);
        osc1.frequency.exponentialRampToValueAtTime(180, now + 1.0);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.45, now + 0.08);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 2.0);

        // Lead — accord qui sustain et fade
        const lead = ctx.createOscillator();
        const leadGain = ctx.createGain();
        lead.type = "triangle";
        lead.frequency.setValueAtTime(330, now + 0.9); // mi
        lead.frequency.linearRampToValueAtTime(440, now + 1.4); // la
        leadGain.gain.setValueAtTime(0, now + 0.9);
        leadGain.gain.linearRampToValueAtTime(0.22, now + 1.0);
        leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
        lead.connect(leadGain).connect(ctx.destination);
        lead.start(now + 0.9);
        lead.stop(now + 3.6);

        // Shimmer aigu finale
        const high = ctx.createOscillator();
        const highGain = ctx.createGain();
        high.type = "sine";
        high.frequency.setValueAtTime(880, now + 1.4);
        highGain.gain.setValueAtTime(0, now + 1.4);
        highGain.gain.linearRampToValueAtTime(0.12, now + 1.5);
        highGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
        high.connect(highGain).connect(ctx.destination);
        high.start(now + 1.4);
        high.stop(now + 3.1);
      }
    } catch {
      // user a coupé son ou Web Audio bloqué
    }

    const timer = setTimeout(() => setVisible(false), DURATION_MS);
    return () => {
      clearTimeout(timer);
      if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
    };
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
