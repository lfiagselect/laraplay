// LARAPLAY — Client TV login. Génère device_code au mount, poll status, finalise signIn.

"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

interface DeviceStartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

type PollStatus = "loading" | "pending" | "approved" | "expired" | "denied" | "error";

export function LoginTVClient() {
  const [data, setData] = useState<DeviceStartResponse | null>(null);
  const [status, setStatus] = useState<PollStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  // 1. Bootstrap device_code au mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/device/start", { method: "POST" });
        if (!res.ok) throw new Error("start_failed");
        const json: DeviceStartResponse = await res.json();
        setData(json);
        setStatus("pending");
      } catch {
        setStatus("error");
        setErrorMsg("Impossible d'initialiser la connexion. Réessayez.");
      }
    })();
  }, []);

  // 2. Poll loop
  useEffect(() => {
    if (!data || status !== "pending") return;
    let cancelled = false;
    const intervalMs = Math.max(4_000, data.interval * 1000);

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/auth/device/poll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ device_code: data.device_code }),
        });
        const json = await res.json();
        if (cancelled) return;

        if (json.status === "approved") {
          setStatus("approved");
          // Finalise signIn via Credentials provider "device"
          await signIn("device", {
            device_code: data.device_code,
            redirect: true,
            callbackUrl: "/",
          });
          return;
        }
        if (json.status === "expired") {
          setStatus("expired");
          return;
        }
        if (json.status === "denied") {
          setStatus("denied");
          return;
        }
        // pending / slow_down → reschedule
      } catch {
        // network blip → continue polling
      }
      if (!cancelled) setTimeout(poll, intervalMs);
    };

    const t = setTimeout(poll, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [data, status]);

  // Reload pour nouveau code si expired
  const restart = () => {
    setData(null);
    setStatus("loading");
    setErrorMsg(null);
    startedRef.current = false;
    // Re-trigger bootstrap effect
    setTimeout(() => {
      startedRef.current = true;
      (async () => {
        try {
          const res = await fetch("/api/auth/device/start", { method: "POST" });
          if (!res.ok) throw new Error("start_failed");
          const json: DeviceStartResponse = await res.json();
          setData(json);
          setStatus("pending");
        } catch {
          setStatus("error");
          setErrorMsg("Impossible d'initialiser la connexion. Réessayez.");
        }
      })();
    }, 100);
  };

  return (
    <div className="w-full max-w-3xl text-center">
      <h1 className="logo-wordmark text-7xl md:text-8xl mb-12 select-none">LARAPLAY</h1>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
          <p className="text-lg">Préparation…</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-6">
          <p className="text-red-400 text-lg">{errorMsg}</p>
          <button
            data-focusable
            onClick={restart}
            className="bg-white text-black font-bold px-8 py-4 rounded-lg text-lg hover:bg-zinc-200 transition"
          >
            Réessayer
          </button>
        </div>
      )}

      {status === "pending" && data && (
        <div className="space-y-10">
          <p className="text-2xl text-zinc-300 leading-relaxed">
            Sur votre téléphone ou ordinateur, ouvrez :
          </p>

          <div
            className="font-mono text-3xl md:text-5xl text-white bg-zinc-900 border-2 border-zinc-700 rounded-xl px-8 py-5 inline-block tracking-wide"
          >
            {new URL(data.verification_uri).host}/d
          </div>

          <p className="text-2xl text-zinc-300 mt-8">Et entrez ce code :</p>

          <div
            className="font-mono text-7xl md:text-9xl font-bold text-[var(--accent)] tracking-[0.15em] select-all"
            style={{
              fontFamily: "var(--font-bebas), 'Bebas Neue', monospace",
              textShadow: "0 4px 32px rgba(229, 9, 20, 0.5)",
            }}
          >
            {data.user_code}
          </div>

          <div className="flex items-center justify-center gap-3 mt-12 text-zinc-500 text-base">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>En attente de connexion…</span>
          </div>

          <p className="text-zinc-600 text-sm mt-4">
            Code valide 10 minutes
          </p>
        </div>
      )}

      {status === "approved" && (
        <div className="flex flex-col items-center gap-6 text-zinc-200">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--accent)]" />
          <p className="text-2xl">Connexion en cours…</p>
        </div>
      )}

      {status === "expired" && (
        <div className="space-y-6">
          <p className="text-2xl text-zinc-300">Ce code a expiré.</p>
          <button
            data-focusable
            onClick={restart}
            className="bg-white text-black font-bold px-8 py-4 rounded-lg text-lg hover:bg-zinc-200 transition"
          >
            Générer un nouveau code
          </button>
        </div>
      )}

      {status === "denied" && (
        <div className="space-y-6">
          <p className="text-2xl text-red-400">Connexion refusée.</p>
          <button
            data-focusable
            onClick={restart}
            className="bg-white text-black font-bold px-8 py-4 rounded-lg text-lg hover:bg-zinc-200 transition"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
