// LARAPLAY — Player vidéo.
// State machine événementielle: idle → loading → ready → playing ↔ buffering → error.
// Affiche poster immédiat + loader pendant chargement (perception <100ms).
// Track watch progress (localStorage par user).
// Perf marks: loadstart/canplay/playing latency → /api/log via beacon.
// V2: src = /api/stream/[id] assigné directement (proxy binaire Next.js).

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { getEntry, saveProgress } from "@/lib/watch-progress";
import { track, startTimer } from "@/lib/perf";

type PlayerState = "idle" | "loading" | "ready" | "playing" | "buffering" | "error";

interface PlayerProps {
  src: string; // conservé pour compatibilité appelants — ignoré, on utilise videoId
  poster?: string;
  videoId?: string;
  userEmail?: string;
  className?: string;
  autoPlay?: boolean;
}

export function Player({
  src: _src,
  poster,
  videoId,
  userEmail,
  className = "",
  autoPlay = true,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Assigner le src directement ────────────────────────────────────────────
  const assignSrc = useCallback(() => {
    const v = videoRef.current;
    if (!videoId || !v) return;
    v.src = `/api/stream/${videoId}`;
    v.load();
  }, [videoId]);

  useEffect(() => {
    assignSrc();
  }, [assignSrc]);

  // ── State machine + perf marks ─────────────────────────────────────────────
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
    const onWaiting = () => {
      setState("buffering");
      track({ type: "player.waiting", videoId, ms: elapsed() });
    };
    const onError = () => {
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

    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("error", onError);
    };
  }, [videoId]);

  // ── Resume position ────────────────────────────────────────────────────────
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
      } catch {
        // seek hors range / stream pas prêt — réessaye sur prochain event
      }
    };

    v.addEventListener("loadedmetadata", tryRestore);
    v.addEventListener("canplay", tryRestore);
    return () => {
      v.removeEventListener("loadedmetadata", tryRestore);
      v.removeEventListener("canplay", tryRestore);
    };
  }, [videoId, userEmail]);

  // ── Save progress ──────────────────────────────────────────────────────────
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

  const showLoader = state === "loading" || state === "buffering" || state === "idle";

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        poster={poster}
        className="w-full h-full"
      />

      {poster && state === "idle" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      )}

      {state === "error" && errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-6">
          <div>
            <p className="text-red-400 mb-2">{errorMsg}</p>
            <button
              onClick={() => {
                setErrorMsg(null);
                setState("idle");
                assignSrc();
              }}
              className="text-sm text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
