// LARAPLAY — Hero billboard avec vidéo background.
// Autoplay obligatoirement muet (politique navigateur).
// Active son auto dès 1ère interaction user (clic/scroll/touch).
// Toggle mute manuel disponible.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Info, Volume2, VolumeX } from "lucide-react";
import type { HeroVideo } from "@/lib/hero-videos";
import { useVideoModal } from "./ModalProvider";

interface HeroVideoProps {
  hero: HeroVideo;
}

export function HeroVideoBlock({ hero }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const router = useRouter();
  const { open } = useVideoModal();

  // Sync muted state vers element vidéo
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    // Tente lecture après changement (au cas où autoplay refusé avec son)
    if (!muted) {
      v.play().catch(() => {
        // Browser refuse — on remet en muet
        setMuted(true);
      });
    }
  }, [muted]);

  // Active son auto à 1ère interaction user (autoplay policy contournée)
  useEffect(() => {
    let activated = false;
    const activate = () => {
      if (activated) return;
      activated = true;
      setMuted(false);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("click", activate);
      window.removeEventListener("keydown", activate);
      window.removeEventListener("scroll", activate);
      window.removeEventListener("touchstart", activate);
    };
    window.addEventListener("click", activate, { once: false });
    window.addEventListener("keydown", activate, { once: false });
    window.addEventListener("scroll", activate, { once: false });
    window.addEventListener("touchstart", activate, { once: false });
    return cleanup;
  }, []);

  const goLecture = () => router.push(hero.ctaLecture);
  const onInfo = () => {
    if (hero.ctaInfoVideoId) open(hero.ctaInfoVideoId);
    else router.push(hero.ctaLecture);
  };

  return (
    <section
      className="relative w-full overflow-hidden -mt-[72px] aspect-video max-h-[85vh] min-h-[480px] bg-black bg-cover bg-center"
      style={{ backgroundImage: `url(${hero.poster})` }}
    >
      {/* Image fallback toujours présente en couche dessous (visible avant + après vidéo) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.poster}
        alt={hero.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {!ended && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={hero.poster}
          onEnded={() => setEnded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          src={hero.src}
        />
      )}

      {/* Gradient bas */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />

      {/* Bouton mute */}
      {!ended && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 border-white/40 bg-black/30 hover:border-white hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition z-20"
          aria-label={muted ? "Activer son" : "Couper son"}
        >
          {muted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      )}

      {/* Contenu textuel + CTA */}
      <div className="absolute inset-0 flex items-end pb-16 md:pb-24 z-10">
        <div className="max-w-3xl px-4 md:px-12">
          {hero.tag && (
            <p className="text-xs md:text-sm uppercase tracking-[0.25em] text-red-600 font-bold mb-3">
              {hero.tag}
            </p>
          )}
          <h1 className="hero-title text-white drop-shadow-2xl mb-3">
            {hero.title}
          </h1>
          {hero.subtitle && (
            <p className="text-base md:text-lg text-zinc-200 mb-6 max-w-xl drop-shadow-lg">
              {hero.subtitle}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={goLecture}
              className="flex items-center gap-2 bg-white text-black font-bold px-7 py-2.5 rounded hover:bg-zinc-200 transition"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Lecture
            </button>
            <button
              onClick={onInfo}
              className="flex items-center gap-2 bg-zinc-700/60 text-white font-bold px-7 py-2.5 rounded hover:bg-zinc-700/80 backdrop-blur-sm transition"
            >
              <Info className="w-5 h-5" />
              Plus d&apos;infos
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
