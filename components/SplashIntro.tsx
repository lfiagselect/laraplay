// LARAPLAY — Splash 1×/jour. TUDUM Web Audio.

"use client";

import { useEffect, useState } from "react";

const KEY = "laraplay-splash-day";
const DURATION_MS = 4000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SplashIntro() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip splash sur TV (animations lourdes + bouton Passer perturbe nav D-pad)
    if (document.documentElement.classList.contains("tv")) {
      setVisible(false);
      return;
    }
    const last = localStorage.getItem(KEY);
    if (last === today()) {
      setVisible(false);
      return;
    }
    setVisible(true);
    localStorage.setItem(KEY, today());

    let ctx: AudioContext | null = null;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-18, now);
      comp.knee.setValueAtTime(8, now);
      comp.ratio.setValueAtTime(4, now);
      comp.attack.setValueAtTime(0.005, now);
      comp.release.setValueAtTime(0.2, now);
      comp.connect(ctx.destination);
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, now);
      masterGain.connect(comp);

      const tu = now;
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = "sine";
      kick.frequency.setValueAtTime(120, tu);
      kick.frequency.exponentialRampToValueAtTime(35, tu + 0.18);
      kickGain.gain.setValueAtTime(0, tu);
      kickGain.gain.linearRampToValueAtTime(0.9, tu + 0.005);
      kickGain.gain.exponentialRampToValueAtTime(0.001, tu + 0.25);
      kick.connect(kickGain).connect(masterGain);
      kick.start(tu);
      kick.stop(tu + 0.3);

      const noiseBuf = ctx.createBuffer(1, 2048, ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 3);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setValueAtTime(2000, tu);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, tu);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, tu + 0.08);
      noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
      noise.start(tu);

      const dum = now + 0.5;
      const dumEnd = dum + 3.0;
      const f = 55;
      const partials = [
        { freq: f, gain: 0.55, type: "sine" as OscillatorType },
        { freq: f * 2, gain: 0.35, type: "sine" as OscillatorType },
        { freq: f * 3, gain: 0.15, type: "sine" as OscillatorType },
        { freq: f * 4, gain: 0.10, type: "triangle" as OscillatorType },
      ];
      partials.forEach(({ freq, gain, type }) => {
        const osc = ctx!.createOscillator();
        const g = ctx!.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, dum);
        g.gain.setValueAtTime(0, dum);
        g.gain.linearRampToValueAtTime(gain, dum + 0.04);
        g.gain.exponentialRampToValueAtTime(gain * 0.5, dum + 0.8);
        g.gain.exponentialRampToValueAtTime(0.001, dumEnd);
        osc.connect(g).connect(masterGain);
        osc.start(dum);
        osc.stop(dumEnd + 0.1);
      });

      const sub = ctx.createOscillator();
      const subG = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(27.5, dum);
      subG.gain.setValueAtTime(0, dum);
      subG.gain.linearRampToValueAtTime(0.4, dum + 0.06);
      subG.gain.exponentialRampToValueAtTime(0.001, dumEnd);
      sub.connect(subG).connect(masterGain);
      sub.start(dum);
      sub.stop(dumEnd + 0.1);

      const delay = ctx.createDelay(1.5);
      delay.delayTime.setValueAtTime(0.3, now);
      const delayGain = ctx.createGain();
      delayGain.gain.setValueAtTime(0.18, now);
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = "lowpass";
      delayFilter.frequency.setValueAtTime(1500, now);
      masterGain.connect(delayFilter).connect(delay).connect(delayGain).connect(comp);
      delayGain.connect(delay);
    } catch {}

    const t = setTimeout(() => setVisible(false), DURATION_MS);
    return () => {
      clearTimeout(t);
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
        <div className="absolute inset-0 blur-3xl opacity-60 bg-red-600 animate-splash-glow rounded-full" />
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
