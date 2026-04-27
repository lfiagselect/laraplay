// LARAPLAY — Header global. Logo + nav + recherche + profil.

import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "./Logo";
import { Search, LogOut } from "lucide-react";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex items-center gap-8">
        <Link href="/" className="shrink-0">
          <Logo size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-200">
          <Link href="/" className="hover:text-white transition">Accueil</Link>
          <Link href="/categories" className="hover:text-white transition">Catégories</Link>
          <Link href="/eras" className="hover:text-white transition">Ères</Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/search"
            className="p-2 rounded hover:bg-zinc-800/60 transition"
            aria-label="Rechercher"
          >
            <Search className="w-5 h-5" />
          </Link>

          {session?.user && (
            <div className="flex items-center gap-3">
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
                  className="p-2 rounded hover:bg-zinc-800/60 transition"
                  aria-label="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
