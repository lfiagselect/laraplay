// LARAPLAY — Bottom tab bar mobile (V2 §9)
// Navigation principale mobile. Burger relégué aux paramètres.
// 4 onglets : Accueil, Recherche, Ma liste, Profil.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, List, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface TabItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: (path: string) => boolean;
}

const TABS: TabItem[] = [
  { href: "/", label: "Accueil", Icon: Home, match: (p) => p === "/" },
  { href: "/search", label: "Recherche", Icon: Search, match: (p) => p.startsWith("/search") },
  { href: "/my-list", label: "Ma liste", Icon: List, match: (p) => p.startsWith("/my-list") },
  { href: "/categories", label: "Catégories", Icon: User, match: (p) => p.startsWith("/categories") || p.startsWith("/category") || p.startsWith("/eras") },
];

export function BottomTabBar() {
  const pathname = usePathname() ?? "/";

  // Cache barre sur pages watch (lecture immersive)
  if (pathname.startsWith("/watch/")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0b0b]/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-4 h-16">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className={[
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition",
                  active ? "text-white" : "text-[var(--text-muted)] hover:text-white",
                ].join(" ")}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "" : ""}`}
                  fill={active ? "currentColor" : "none"}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={`text-[10px] ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
