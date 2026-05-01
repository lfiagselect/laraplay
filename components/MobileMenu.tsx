// LARAPLAY — Menu burger mobile (visible < md breakpoint).
// Slide-in depuis gauche, fermeture overlay/escape.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Home, Folder, Disc3, Heart, Search } from "lucide-react";
import { Logo } from "./Logo";

interface MobileMenuProps {
  userName?: string | null;
}

const NAV_ITEMS = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/categories", label: "Catégories", Icon: Folder },
  { href: "/eras", label: "Ères", Icon: Disc3 },
  { href: "/my-list", label: "Ma liste", Icon: Heart },
  { href: "/search", label: "Rechercher", Icon: Search },
];

export function MobileMenu({ userName }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -ml-2 rounded hover:bg-zinc-800/60 transition"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <Logo size="md" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded hover:bg-zinc-800 transition"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {userName && (
              <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300">
                Connecté en tant que <span className="font-semibold text-white">{userName}</span>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto p-2">
              {NAV_ITEMS.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-200 hover:bg-zinc-800 hover:text-white transition"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base">{label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
              LARAPLAY · Streaming privé
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
