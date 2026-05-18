// LARAPLAY — Page Paramètres user
// Tout utilisateur connecté. Bouton actualiser catalogue + infos compte.

import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-20 md:pt-24 pb-8">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] font-bold mb-2">
            Compte
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Paramètres
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Gestion de votre compte et de votre expérience.
          </p>
        </div>

        <SettingsClient
          userName={session.user.name ?? null}
          userEmail={session.user.email}
        />

        <div className="mt-8 bg-[var(--bg-elevated)] rounded-xl p-5 md:p-6 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-2">Session</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Connecté en tant que <span className="text-white font-medium">{session.user.email}</span>
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-5 py-2.5 rounded-lg active:scale-[0.98] transition"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
