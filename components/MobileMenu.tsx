// LARAPLAY — Menu burger mobile (visible < md breakpoint).
// Slide-in depuis gauche, fermeture overlay/escape.
// Lock scroll body sans perdre la position (fix iOS Safari).

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, Home, Folder, Disc3, Heart, Search, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

interface MobileMenuProps {
  userName?: string | null;
  isAdmin?: boolean;
}

const NAV_ITEMS = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/categories", label: "Catégories", Icon: Folder },
  { href: "/eras", label: "Ères", Icon: Disc3 },
  { href: "/my-list", label: "Ma liste", Icon: Heart },
  { href: "/search", label: "Rechercher", Icon: Search },
];

export function MobileMenu({ userName, isAdmin = false }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const savedScrollY = useRef(0);

  useEffect(() => {
    if (!open) return;

    // Lock scroll body en préservant la position (fix iOS Safari qui remonte sinon)
    savedScrollY.current = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore scroll
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      window.scrollTo(0, savedScrollY.current);
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
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
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
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--accent)] hover:bg-zinc-800 hover:text-white transition mt-2 border-t border-zinc-800/50 pt-4"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-base font-semibold">Administration</span>
                </Link>
              )}
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
