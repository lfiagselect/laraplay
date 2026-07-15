// LARAPLAY — Player TV custom (10-foot UI).
// Reprend la state machine du Player desktop + perf marks + watch-progress.
// Diffs:
//   - contrôles natifs désactivés → overlay custom focusable D-pad (sections TV)
//   - preload="auto" (TV slow start tolère mal preload=metadata)
//   - Space/Enter toggle play, ←/→ skip ±10s, MediaPlay/Pause natif
//   - Auto-hide controls 3s sans input, ↓ ré-affiche + focus play
//   - Progress bar custom focusable, ←/→ scrub quand focus barre
//   - Bouton Back retour /home (Esc/Backspace)
//
// Activé uniquement quand isTV. Composant indépendant: zéro régression Player.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  X,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getEntry, saveProgress } from "@/lib/watch-progress";
import { track, startTimer } from "@/lib/perf";
import { matchTVKeyEvent } from "@/lib/tv";
import { pad2 } from "@/lib/format";
import { safePlay } from "@/lib/media";

type PlayerState = "idle" | "loading" | "ready" | "playing" | "paused" | "buffering" | "error";

interface PlayerTVProps {
  /** Sources ordonnées : MP4 720/480/360 puis HLS de secours. */
  sources: string[];
  poster?: string;
  videoId?: string;
  userEmail?: string;
  className?: string;
  /** URL retour si user appuie Back / X. Défaut "/" */
  backHref?: string;
}

const SKIP_SEC = 10;
const CONTROLS_HIDE_MS = 3500;

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}

export function PlayerTV({
  sources,
  poster,
  videoId,
  userEmail,
  className = "",
  backHref = "/",
}: PlayerTVProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  const [state, setState] = useState<PlayerState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sourceIndex, setSourceIndex] = useState(0);
  const router = useRouter();
  const sourcesKey = sources.join("\n");
  const currentSrc = sources[sourceIndex] ?? "";
  const stateRef = useRef<PlayerState>("idle");
  useEffect(() => { stateRef.current = state; }, [state]);

  // PLAYER-02: ne jamais masquer pendant focus contrôle, pause, erreur ou buffering.
  const canHideControls = () => {
    const st = stateRef.current;
    if (st !== "playing") return false;
    const active = document.activeElement;
    return !(active && containerRef.current?.contains(active) && active !== document.body);
  };
  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (canHideControls()) setControlsVisible(false);
      else showControls(); // re-armer tant que masquage interdit
    }, CONTROLS_HIDE_MS);
  };

  // ============ HLS loader (hls.js fallback si pas support natif) ============
  // Bunny stream URL = playlist.m3u8 (HLS).
  // Safari/iOS/Tizen récent/WebOS récent: lecture native via v.src = url.
  // Autres (Android natif, Tizen ancien, Chrome desktop): besoin hls.js.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentSrc) return;

    const isHls = /\.m3u8($|\?)/i.test(currentSrc);
    const canPlayHlsNatively = v.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (!isHls || canPlayHlsNatively) {
      v.src = currentSrc;
      return;
    }

    // Charge hls.js dynamiquement (évite poids initial pour TVs natives)
    let cancelled = false;
    const sourceStartedAt = Date.now();
    (async () => {
      try {
        const HlsModule = await import("hls.js");
        if (cancelled) return;
        const Hls = HlsModule.default;
        if (!Hls.isSupported()) {
          // Browser ne support pas MSE → fallback URL directe (échouera mais clean error)
          v.src = currentSrc;
          return;
        }
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(currentSrc);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          try { hls.destroy(); } catch {}
          if (hlsRef.current === hls) hlsRef.current = null;
          setState("error");
          setErrorMsg("Erreur de lecture. Réessaie.");
          track({
            type: "player.error",
            videoId,
            ms: Date.now() - sourceStartedAt,
            meta: { code: -1, message: `hls:${data.type}:${data.details}` },
          });
        });
        hlsRef.current = hls;
      } catch (err) {
        console.error("[PlayerTV] HLS load failed:", err);
        v.src = currentSrc; // ultime fallback
      }
    })();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [currentSrc, videoId]);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourcesKey]);

  // ============ State machine + perf marks (clone Player.tsx) ============
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const elapsed = startTimer();

    const onLoadStart = () => {
      setState("loading");
      track({ type: "player.loadstart", videoId, ms: elapsed() });
    };
    const onCanPlay = () => {
      setState((s) => (s === "playing" ? s : "ready"));
      track({ type: "player.canplay", videoId, ms: elapsed() });
    };
    const onPlaying = () => {
      setState("playing");
      track({ type: "player.playing", videoId, ms: elapsed() });
    };
    const onPause = () => setState("paused"); // PLAYER-02: pause pendant buffering = paused, loader retiré
    const onWaiting = () => {
      setState("buffering");
      track({ type: "player.waiting", videoId, ms: elapsed() });
    };
    const onError = () => {
      if (sourceIndex + 1 < sources.length) {
        track({
          type: "player.source_fallback",
          videoId,
          ms: elapsed(),
          meta: { from: sourceIndex, to: sourceIndex + 1 },
        });
        setErrorMsg(null);
        setState("loading");
        setSourceIndex((index) => Math.min(index + 1, sources.length - 1));
        return;
      }
      setState("error");
      setErrorMsg("Erreur de lecture. Réessaie.");
      const err = v.error;
      track({
        type: "player.error",
        videoId,
        ms: elapsed(),
        meta: { code: err?.code ?? -1, message: err?.message ?? "unknown" },
      });
    };
    const onStalled = () => setState("buffering");
    const onTime = () => setCurrentTime(v.currentTime);
    const onDuration = () => setDuration(v.duration || 0);
    const onProgress = () => {
      try {
        const b = v.buffered;
        if (b.length > 0) setBuffered(b.end(b.length - 1));
      } catch {}
    };

    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("error", onError);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDuration);
    v.addEventListener("progress", onProgress);

    return () => {
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("error", onError);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDuration);
      v.removeEventListener("progress", onProgress);
    };
  }, [videoId, sourceIndex, sources.length]);

  // ============ Resume position (clone Player.tsx) ============
  useEffect(() => {
    if (!videoId || !userEmail) return;
    const entry = getEntry(userEmail, videoId);
    if (!entry) return;
    const v = videoRef.current;
    if (!v) return;

    let restored = false;
    const tryRestore = () => {
      if (restored) return;
      try {
        if (!isFinite(v.duration) || v.duration <= 0) return;
        v.currentTime = Math.max(0, Math.min(entry.position - 5, v.duration - 1));
        restored = true;
      } catch {}
    };
    v.addEventListener("loadedmetadata", tryRestore);
    v.addEventListener("canplay", tryRestore);
    return () => {
      v.removeEventListener("loadedmetadata", tryRestore);
      v.removeEventListener("canplay", tryRestore);
    };
  }, [videoId, userEmail]);

  // ============ Save progress (clone Player.tsx) ============
  useEffect(() => {
    if (!videoId || !userEmail) return;
    const v = videoRef.current;
    if (!v) return;

    let lastSave = 0;
    const SAVE_INTERVAL_MS = 10_000;

    const persist = (force = false) => {
      if (!v.duration || !isFinite(v.duration)) return;
      const now = Date.now();
      if (!force && now - lastSave < SAVE_INTERVAL_MS) return;
      lastSave = now;
      const completed = v.currentTime >= v.duration * 0.9;
      saveProgress(userEmail, {
        videoId,
        position: v.currentTime,
        duration: v.duration,
        updatedAt: now,
        completed,
      });
    };

    const onTime = () => persist();
    const onPause = () => persist(true);
    const onEnded = () => persist(true);
    const onBeforeUnload = () => persist(true);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", onBeforeUnload);
      persist(true);
    };
  }, [videoId, userEmail]);

  // ============ Keyboard / D-pad ============
  // Note: spatial-nav global gère ↑↓←→ pour focus entre boutons.
  // Ici on ajoute raccourcis lecture (PlayPause keys, skip via boutons focusés).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;

      // Reveal controls sur n'importe quelle key
      showControls();

      // MediaPlayPause natif TV remote
      if (matchTVKeyEvent(e, "PLAY") || matchTVKeyEvent(e, "PAUSE")) {
        e.preventDefault();
        if (v.paused) safePlay(v);
        else v.pause();
        return;
      }
      // Stop → pause + retour 0
      if (matchTVKeyEvent(e, "STOP")) {
        e.preventDefault();
        v.pause();
        try { v.currentTime = 0; } catch {}
        return;
      }
      // Rewind / Fast Forward natif → ±10s
      if (matchTVKeyEvent(e, "REWIND")) {
        e.preventDefault();
        try { v.currentTime = Math.max(0, v.currentTime - SKIP_SEC); } catch {}
        return;
      }
      if (matchTVKeyEvent(e, "FORWARD")) {
        e.preventDefault();
        try { v.currentTime = Math.min(v.duration || Infinity, v.currentTime + SKIP_SEC); } catch {}
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus initial sur Play button après mount
  useEffect(() => {
    const t = setTimeout(() => {
      playBtnRef.current?.focus();
      showControls();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse move desktop reveal
  const onPointerMove = () => showControls();

  // Actions
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) safePlay(v);
    else v.pause();
  };
  const skipBack = () => {
    const v = videoRef.current;
    if (!v) return;
    try { v.currentTime = Math.max(0, v.currentTime - SKIP_SEC); } catch {}
  };
  const skipFwd = () => {
    const v = videoRef.current;
    if (!v) return;
    try { v.currentTime = Math.min(v.duration || Infinity, v.currentTime + SKIP_SEC); } catch {}
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };
  const onBack = () => router.replace(backHref);

  const showLoader = state === "loading" || state === "buffering" || state === "idle";
  const isPlaying = state === "playing";
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={onPointerMove}
      className={`relative bg-black ${className}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        preload="auto"
        poster={poster}
        muted={muted}
        className="w-full h-full object-contain"
      />

      {/* Poster initial */}
      {poster && state === "idle" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Loader */}
      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-16 h-16 text-[var(--accent)] animate-spin" />
        </div>
      )}

      {/* Erreur */}
      {state === "error" && errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 text-center p-8">
          <div data-tv-section="player-error">
            <p className="text-red-400 mb-4 text-lg">{errorMsg}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                data-focusable
                autoFocus
                onClick={() => {
                  setErrorMsg(null);
                  setState("loading");
                  if (sourceIndex === 0) videoRef.current?.load();
                  else setSourceIndex(0);
                }}
                className="text-base text-white bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded"
              >
                Réessayer
              </button>
              <button
                data-focusable
                onClick={onBack}
                className="text-base text-white bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Overlay Controls === */}
      <div
        className={[
          "absolute inset-0 flex flex-col justify-between pointer-events-none transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {/* Top bar: Back button */}
        <div className="pointer-events-auto bg-gradient-to-b from-black/80 to-transparent p-6" data-tv-section="player-top">
          <button
            data-focusable
            data-tv-back
            onClick={onBack}
            aria-label="Retour"
            className="w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition"
          >
            <X className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6 md:p-10 space-y-4">
          {/* Progress bar */}
          <div className="space-y-2" data-tv-section="player-progress">
            <div
              data-focusable
              data-tv-keep-horizontal
              role="slider"
              aria-label="Progression"
              aria-valuemin={0}
              aria-valuemax={duration || 100}
              aria-valuenow={currentTime}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  skipBack();
                  showControls();
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  skipFwd();
                  showControls();
                }
              }}
              className="relative h-2 bg-white/20 rounded-full cursor-pointer focus:h-3 transition-all"
            >
              <div
                className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-[var(--accent)] rounded-full"
                style={{ width: `${progressPct}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--accent)] rounded-full shadow-lg"
                style={{ left: `calc(${progressPct}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-sm text-white/90 font-medium tabular-nums">
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-4 md:gap-6" data-tv-section="player-transport">
            <button
              data-focusable
              onClick={skipBack}
              aria-label="Reculer 10 secondes"
              className="w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition"
            >
              <RotateCcw className="w-7 h-7 text-white" />
            </button>

            <button
              ref={playBtnRef}
              data-focusable
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Lecture"}
              className="w-20 h-20 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition shadow-2xl"
            >
              {isPlaying ? (
                <Pause className="w-9 h-9" fill="currentColor" />
              ) : (
                <Play className="w-9 h-9 ml-1" fill="currentColor" />
              )}
            </button>

            <button
              data-focusable
              onClick={skipFwd}
              aria-label="Avancer 10 secondes"
              className="w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition"
            >
              <RotateCw className="w-7 h-7 text-white" />
            </button>

            <button
              data-focusable
              onClick={toggleMute}
              aria-label={muted ? "Activer son" : "Couper son"}
              className="ml-auto w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition"
            >
              {muted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
