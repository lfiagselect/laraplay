// LARAPLAY — Bottom tab bar mobile (V2 §9)
// Navigation principale mobile. 5 onglets standards + 6e Admin si role=admin.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, List, Folder, Disc3, ShieldCheck } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface TabItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: (path: string) => boolean;
}

const BASE_TABS: TabItem[] = [
  { href: "/", label: "Accueil", Icon: Home, match: (p) => p === "/" },
  { href: "/search", label: "Recherche", Icon: Search, match: (p) => p.startsWith("/search") },
  { href: "/my-list", label: "Ma liste", Icon: List, match: (p) => p.startsWith("/my-list") },
  { href: "/categories", label: "Catégories", Icon: Folder, match: (p) => p.startsWith("/categories") || p.startsWith("/category") },
  { href: "/eras", label: "Ères", Icon: Disc3, match: (p) => p.startsWith("/eras") },
];

const ADMIN_TAB: TabItem = {
  href: "/admin",
  label: "Admin",
  Icon: ShieldCheck,
  match: (p) => p.startsWith("/admin"),
};

const HIDDEN_PATHS = new Set(["/login", "/unauthorized"]);

export function BottomTabBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? "/";

  if (HIDDEN_PATHS.has(pathname)) return null;
  if (pathname.startsWith("/watch/")) return null;

  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;
  const cols = tabs.length === 6 ? "grid-cols-6" : "grid-cols-5";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0b0b]/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className={`grid ${cols} h-16`}>
        {tabs.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          const isAdminTab = href === "/admin";
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className={[
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition px-1",
                  active
                    ? isAdminTab
                      ? "text-[var(--accent)]"
                      : "text-white"
                    : isAdminTab
                      ? "text-[var(--accent)]/70 hover:text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:text-white",
                ].join(" ")}
              >
                <Icon
                  className="w-5 h-5"
                  fill={active && !isAdminTab ? "currentColor" : "none"}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className={`text-[10px] leading-tight ${active ? "font-semibold" : ""}`}>
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
