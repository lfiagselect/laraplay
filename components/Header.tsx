// LARAPLAY — Header global. Logo + nav desktop + menu burger mobile + recherche + profil.
// Lien Admin (rouge) si admin, sinon Paramètres (gris).

import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "./Logo";
import { Search, LogOut, ShieldCheck, Settings } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { HeaderShell } from "./HeaderShell";

export async function Header() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const isLogged = !!session?.user?.email;

  return (
    <HeaderShell>
      <header className="max-w-[1600px] mx-auto px-4 md:px-12 py-4 flex items-center gap-4 md:gap-8">
        <MobileMenu userName={session?.user?.name ?? null} isAdmin={isAdmin} />

        <Link href="/" className="shrink-0">
          <Logo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-200">
          <Link href="/" className="hover:text-white transition">Accueil</Link>
          <Link href="/categories" className="hover:text-white transition">Catégories</Link>
          <Link href="/eras" className="hover:text-white transition">Ères</Link>
          <Link href="/my-list" className="hover:text-white transition">Ma liste</Link>
          {isLogged && (
            isAdmin ? (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-[var(--accent)] hover:text-white transition"
                title="Administration"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            ) : (
              <Link
                href="/settings"
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
                  await signOut({ redirectTo: "/login" });
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
