// LARAPLAY — Wrapper client du Header
// Gère état scroll : transparent au top, #141414 backdrop-blur dès scrollY>40px.
// Sticky pour préserver flow document + safe-area-inset-top.

"use client";

import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 40;

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "bg-[#141414]/95 backdrop-blur-md shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
          : "bg-gradient-to-b from-black/60 via-black/30 to-transparent backdrop-blur-sm",
      ].join(" ")}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {children}
    </div>
  );
}
