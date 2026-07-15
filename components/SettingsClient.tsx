// LARAPLAY — Settings UI (client)
// Bouton actualiser catalogue + infos user.

"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Database, User } from "lucide-react";

interface SettingsClientProps {
  userName: string | null;
  userEmail: string;
}

export function SettingsClient({ userName, userEmail }: SettingsClientProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    setMsg(null);
    setIsError(false);
    try {
      const res = await fetch("/api/refresh-catalog", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMsg(`Catalogue rafraîchi : ${data.videos} vidéos en ${data.ms}ms`);
      setIsError(false);
      setTimeout(() => setMsg(null), 5000);
    } catch (e) {
      setMsg(`Erreur : ${e instanceof Error ? e.message : "unknown"}`);
      setIsError(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profil */}
      <section className="bg-[var(--bg-elevated)] rounded-xl p-5 md:p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--accent)]" />
          Profil
        </h2>
        <dl className="space-y-2 text-sm">
          {userName && (
            <div className="flex flex-col sm:flex-row sm:gap-3">
              <dt className="text-[var(--text-muted)] sm:w-24">Nom</dt>
              <dd className="text-white">{userName}</dd>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="text-[var(--text-muted)] sm:w-24">Email</dt>
            <dd className="text-white">{userEmail}</dd>
          </div>
        </dl>
      </section>

      {/* Refresh catalogue */}
      <section className="bg-[var(--bg-elevated)] rounded-xl p-5 md:p-6 border border-white/5">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-[var(--accent)]" />
              Catalogue vidéos
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Actualise la liste des vidéos depuis Bunny Stream.
              Utilise ce bouton si une nouvelle vidéo n&apos;apparaît pas encore.
            </p>
            {msg && (
              <p className={`text-sm mt-2 ${isError ? "text-red-400" : "text-green-400"}`}>
                {msg}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="bg-white text-black font-bold px-5 py-2.5 rounded-lg hover:bg-zinc-200 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Actualiser le catalogue
          </button>
        </div>
      </section>
    </div>
  );
}
