// LARAPLAY — Client phone: input code device + verify.

"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  initialCode?: string;
}

export function DeviceVerifyClient({ initialCode = "" }: Props) {
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-submit si code fourni en query string
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/device/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "expired"
            ? "Ce code a expiré."
            : json.error === "invalid_code"
              ? "Code invalide. Vérifiez la saisie."
              : json.error === "not_whitelisted"
                ? "Votre email n'est pas autorisé."
                : "Erreur lors de l'autorisation.",
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-zinc-200 py-8">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <p className="text-xl font-semibold">Téléviseur connecté !</p>
        <p className="text-zinc-400 text-sm text-center">
          Retournez à votre téléviseur, la connexion va se finaliser automatiquement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-5">
      <input
        type="text"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="XXXX-XXXX"
        maxLength={9}
        className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-[var(--accent)] text-white text-center text-3xl font-mono tracking-[0.2em] py-4 rounded-lg outline-none uppercase"
        autoComplete="off"
        autoCapitalize="characters"
      />

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/60 text-red-300 text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || code.trim().length < 8}
        className="w-full bg-white text-black font-bold py-3.5 px-4 rounded-lg hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connexion…
          </>
        ) : (
          "Autoriser le téléviseur"
        )}
      </button>
    </form>
  );
}
