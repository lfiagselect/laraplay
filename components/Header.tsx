// LARAPLAY — Header global. Logo + nav desktop + recherche + profil.
// Burger mobile supprimé — navigation via BottomTabBar.

import { cookies, headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { Logo } from "./Logo";
import { Search, LogOut, ShieldCheck, Settings } from "lucide-react";
import { HeaderShell } from "./HeaderShell";
import { detectTVServer } from "@/lib/tv";

export async function Header() {
  const [session, hdrs, cookieStore] = await Promise.all([auth(), headers(), cookies()]);
  const isAdmin = session?.user?.role === "admin";
  const isLogged = !!session?.user?.email;
  const isTV = detectTVServer(hdrs.get("user-agent")) || cookieStore.get("laraplay_legacy_tv")?.value === "1";
  const logoutRedirect = isTV ? "/login-basic" : "/login";

  return (
    <HeaderShell>
      <header data-tv-section="header" className="max-w-[1600px] mx-auto px-4 md:px-12 py-4 flex items-center gap-4 md:gap-8">
        <a href="/" data-focusable className="shrink-0">
          <Logo size="md" />
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-200">
          <a href="/" data-focusable className="hover:text-white transition">Accueil</a>
          <a href="/categories" data-focusable className="hover:text-white transition">Catégories</a>
          <a href="/eras" data-focusable className="hover:text-white transition">Ères</a>
          <a href="/my-list" data-focusable className="hover:text-white transition">Ma liste</a>
          {isLogged && (
            isAdmin ? (
              <a
                href="/admin"
                data-focusable
                className="flex items-center gap-1.5 text-[var(--accent)] hover:text-white transition"
                title="Administration"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </a>
            ) : (
              <a
                href="/settings"
                data-focusable
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </a>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <a
            href="/search"
            data-focusable
            className="p-2 rounded hover:bg-white/10 transition"
            aria-label="Rechercher"
          >
            <Search className="w-5 h-5" />
          </a>

          {session?.user && (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="hidden md:inline text-sm text-zinc-300">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: logoutRedirect });
                }}
              >
                <button
                  type="submit"
                  data-focusable
                  className="p-2 rounded hover:bg-white/10 transition"
                  aria-label="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
    </HeaderShell>
  );
}
