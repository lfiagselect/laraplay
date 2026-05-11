// LARAPLAY — Hook watch-progress pour iframe Bunny Stream
// Listen postMessage events Bunny + persist localStorage + auto-resume.
//
// Bunny events (origin: iframe.mediadelivery.net):
//   { event: "ready", duration }
//   { event: "timeupdate", currentTime, duration }
//   { event: "play" | "pause" | "ended" | "seeked", currentTime, duration }
//
// Resume: postMessage { event: "seek", seconds } à l'iframe au "ready".

"use client";

import { useEffect, useRef, type RefObject } from "react";
import { getEntry, saveProgress } from "./watch-progress";

interface UseBunnyProgressOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  videoId?: string;
  userEmail?: string | null;
  enabled?: boolean;
  resume?: boolean;
}

const SAVE_INTERVAL_MS = 10_000;
const RESUME_OFFSET_S = 3;
const MIN_RESUME_POSITION_S = 5;
const BUNNY_ORIGIN = "https://iframe.mediadelivery.net";

export function useBunnyProgress({
  iframeRef,
  videoId,
  userEmail,
  enabled = true,
  resume = true,
}: UseBunnyProgressOptions) {
  const stateRef = useRef({ position: 0, duration: 0 });
  const lastSaveRef = useRef(0);

  useEffect(() => {
    if (!enabled || !videoId || !userEmail) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const persist = (force = false) => {
      const { position, duration } = stateRef.current;
      if (!duration || !isFinite(duration) || duration <= 0) return;
      const now = Date.now();
      if (!force && now - lastSaveRef.current < SAVE_INTERVAL_MS) return;
      lastSaveRef.current = now;
      saveProgress(userEmail, {
        videoId,
        position,
        duration,
        updatedAt: now,
        completed: position >= duration * 0.9,
      });
    };

    const onMessage = (e: MessageEvent) => {
      if (typeof e.origin !== "string" || !e.origin.includes("mediadelivery.net")) return;
      if (e.source !== iframe.contentWindow) return;

      const data = e.data;
      if (!data || typeof data !== "object") return;

      const event = (data as { event?: string }).event;
      const currentTime = Number((data as { currentTime?: number }).currentTime);
      const duration = Number((data as { duration?: number }).duration);

      if (isFinite(currentTime)) stateRef.current.position = currentTime;
      if (isFinite(duration) && duration > 0) stateRef.current.duration = duration;

      switch (event) {
        case "ready": {
          if (!resume) break;
          const entry = getEntry(userEmail, videoId);
          if (entry && entry.position > MIN_RESUME_POSITION_S && !entry.completed) {
            const target = Math.max(0, entry.position - RESUME_OFFSET_S);
            iframe.contentWindow?.postMessage(
              { event: "seek", seconds: target },
              BUNNY_ORIGIN
            );
          }
          break;
        }
        case "timeupdate":
          persist();
          break;
        case "pause":
        case "ended":
        case "seeked":
          persist(true);
          break;
      }
    };

    const onUnload = () => persist(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist(true);
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      persist(true);
    };
  }, [iframeRef, videoId, userEmail, enabled, resume]);
}
