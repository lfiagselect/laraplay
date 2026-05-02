// LARAPLAY — Admin UI (client)
// Liste users + form ajout + bouton désactiver/supprimer par ligne.

"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus, ShieldCheck, Power, RefreshCw } from "lucide-react";

interface WhitelistEntry {
  email: string;
  name: string;
  active: boolean;
  role: "admin" | "user";
  addedAt?: string;
}

export function AdminClient() {
  const [users, setUsers] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // email en cours d'action

  // Form ajout
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes("@")) {
      setError("Email invalide");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim(),
          role: newRole,
          active: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setNewEmail("");
      setNewName("");
      setNewRole("user");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur ajout");
    } finally {
      setAdding(false);
    }
  };

  const onToggleActive = async (entry: WhitelistEntry) => {
    setBusy(entry.email);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: entry.email,
          name: entry.name,
          role: entry.role,
          active: !entry.active,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const onRemove = async (email: string, hard: boolean) => {
    const confirmMsg = hard
      ? `Supprimer définitivement ${email} ?`
      : `Désactiver ${email} ?`;
    if (!confirm(confirmMsg)) return;

    setBusy(email);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/whitelist?email=${encodeURIComponent(email)}${hard ? "&hard=1" : ""}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  const onTogglePromote = async (entry: WhitelistEntry) => {
    setBusy(entry.email);
    setError(null);
    try {
      const newRole = entry.role === "admin" ? "user" : "admin";
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: entry.email,
          name: entry.name,
          role: newRole,
          active: entry.active,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form ajout */}
      <section className="bg-[var(--bg-elevated)] rounded-xl p-5 md:p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[var(--accent)]" />
          Ajouter un utilisateur
        </h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_auto] gap-3">
          <input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
          />
          <input
            type="text"
            placeholder="Nom (optionnel)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent)] transition"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={adding}
            className="bg-white text-black font-bold px-5 py-2.5 rounded-lg hover:bg-zinc-200 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Ajouter
          </button>
        </form>
      </section>

      {/* Erreur globale */}
      {error && (
        <div className="bg-red-950/60 border border-red-800/60 text-red-300 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Liste users */}
      <section className="bg-[var(--bg-elevated)] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-5 md:p-6 flex items-center justify-between border-b border-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            Liste ({users.length})
          </h2>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-sm text-[var(--text-secondary)] hover:text-white transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)] italic">
            Aucun utilisateur.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {users.map((u) => (
              <li
                key={u.email}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium truncate">
                      {u.email}
                    </span>
                    {u.role === "admin" && (
                      <span className="text-[10px] uppercase tracking-wider bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full font-bold">
                        admin
                      </span>
                    )}
                    {!u.active && (
                      <span className="text-[10px] uppercase tracking-wider bg-zinc-700/40 text-zinc-400 px-2 py-0.5 rounded-full">
                        désactivé
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] mt-0.5 flex flex-wrap gap-2">
                    {u.name && <span>{u.name}</span>}
                    {u.addedAt && <span className="text-[var(--text-muted)]">· ajouté {u.addedAt}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onTogglePromote(u)}
                    disabled={busy === u.email}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white transition disabled:opacity-50"
                    title={u.role === "admin" ? "Rétrograder en user" : "Promouvoir admin"}
                  >
                    {u.role === "admin" ? "↓ user" : "↑ admin"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleActive(u)}
                    disabled={busy === u.email}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white transition disabled:opacity-50 flex items-center gap-1.5"
                    title={u.active ? "Désactiver" : "Réactiver"}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {u.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(u.email, true)}
                    disabled={busy === u.email}
                    className="text-xs px-3 py-1.5 rounded-md bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 transition disabled:opacity-50 flex items-center gap-1.5"
                    title="Supprimer définitivement"
                  >
                    {busy === u.email ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-[var(--text-muted)] text-center">
        Modifications appliquées directement sur le Google Sheet.
        Le service account doit être partagé en éditeur.
      </p>
    </div>
  );
}
