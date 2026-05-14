// LARAPLAY — Header global. Logo + nav desktop + recherche + profil.
// Burger mobile supprimé — navigation via BottomTabBar.

import Link from "next/link";
import { headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { Logo } from "./Logo";
import { Search, LogOut, ShieldCheck, Settings } from "lucide-react";
import { HeaderShell } from "./HeaderShell";
import { detectTVServer } from "@/lib/tv";

export async function Header() {
  const [session, hdrs] = await Promise.all([auth(), headers()]);
  const isAdmin = session?.user?.role === "admin";
  const isLogged = !!session?.user?.email;
  const isTV = detectTVServer(hdrs.get("user-agent"));
  const logoutRedirect = isTV ? "/login-tv" : "/login";

  return (
    <HeaderShell>
      <header data-tv-section="header" className="max-w-[1600px] mx-auto px-4 md:px-12 py-4 flex items-center gap-4 md:gap-8">
        <Link href="/" prefetch={false} className="shrink-0">
          <Logo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-200">
          <Link href="/" prefetch={false} className="hover:text-white transition">Accueil</Link>
          <Link href="/categories" prefetch={false} className="hover:text-white transition">Catégories</Link>
          <Link href="/eras" prefetch={false} className="hover:text-white transition">Ères</Link>
          <Link href="/my-list" prefetch={false} className="hover:text-white transition">Ma liste</Link>
          {isLogged && (
            isAdmin ? (
              <Link
                href="/admin"
                prefetch={false}
                className="flex items-center gap-1.5 text-[var(--accent)] hover:text-white transition"
                title="Administration"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            ) : (
              <Link
                href="/settings"
                prefetch={false}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <Link
            href="/search"
            prefetch={false}
            className="p-2 rounded hover:bg-white/10 transition"
            aria-label="Rechercher"
          >
            <Search className="w-5 h-5" />
          </Link>

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
