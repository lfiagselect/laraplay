// LARAPLAY — Wrapper client du Header
// Netflix-style: bg opacity 0→1 progressif entre 0-80px scroll.
// Gradient transparent au top, solid #141414 dès ~80px.

"use client";

import { useEffect, useState } from "react";

const SCROLL_MAX = 80;

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const ratio = Math.min(1, y / SCROLL_MAX);
      setOpacity(ratio);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      data-header-shell
      className="fixed top-0 left-0 right-0 z-40 w-full transition-colors duration-150"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        backgroundColor: `rgba(11, 11, 11, ${0.35 + opacity * 0.6})`,
        backgroundImage:
          opacity < 0.95
            ? `linear-gradient(180deg, rgba(0,0,0,${0.7 * (1 - opacity)}) 0%, rgba(0,0,0,${0.35 * (1 - opacity)}) 50%, transparent 100%)`
            : "none",
      }}
    >
      {children}
    </div>
  );
}
