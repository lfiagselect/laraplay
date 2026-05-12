// LARAPLAY — Spatial Navigation D-pad pour TV browsers.
"use client";

import { useEffect } from "react";
import { matchTVKey, type TVKeyAction } from "./tv";

const FOCUSABLE_SELECTOR = [
  "[data-focusable]",
  "a[href]:not([data-no-focus])",
  "button:not([disabled]):not([data-no-focus])",
  '[tabindex]:not([tabindex="-1"]):not([data-no-focus])',
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "video[controls]",
].join(",");

const ATTR_DIR_LOCK = "data-tv-trap";

interface FocusableRect {
  el: HTMLElement;
  cx: number;
  cy: number;
  rect: DOMRect;
}

function collectFocusable(root: HTMLElement | Document = document): FocusableRect[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  const out: FocusableRect[] = [];
  for (const el of nodes) {
    if (el.hidden) continue;
    if (el.getAttribute("aria-hidden") === "true") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    out.push({
      el,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      rect,
    });
  }
  return out;
}

function findTrapContainer(active: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = active;
  while (node && node !== document.body) {
    if (node.hasAttribute(ATTR_DIR_LOCK)) return node;
    node = node.parentElement;
  }
  return null;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

function pickBest(
  origin: FocusableRect,
  candidates: FocusableRect[],
  dir: Direction,
): HTMLElement | null {
  let best: { el: HTMLElement; score: number } | null = null;

  for (const c of candidates) {
    if (c.el === origin.el) continue;
    const dx = c.cx - origin.cx;
    const dy = c.cy - origin.cy;
    let primary: number;
    let secondary: number;
    let inDirection = false;
    switch (dir) {
      case "RIGHT":
        primary = dx; secondary = dy;
        inDirection = c.rect.left >= origin.rect.right - 4;
        break;
      case "LEFT":
        primary = -dx; secondary = dy;
        inDirection = c.rect.right <= origin.rect.left + 4;
        break;
      case "DOWN":
        primary = dy; secondary = dx;
        inDirection = c.rect.top >= origin.rect.bottom - 4;
        break;
      case "UP":
        primary = -dy; secondary = dx;
        inDirection = c.rect.bottom <= origin.rect.top + 4;
        break;
    }
    if (!inDirection) continue;
    if (primary <= 0) continue;
    const score = Math.abs(primary) + Math.abs(secondary) * 2;
    if (!best || score < best.score) best = { el: c.el, score };
  }
  return best?.el ?? null;
}

function ensureVisible(el: HTMLElement) {
  // Skip si déjà entièrement visible (évite scroll inutile)
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const fullyVisible = r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw;
  if (fullyVisible) return;

  // Si élément dans un scroller horizontal (data-row-scroller), scroll uniquement
  // le scroller, pas la page entière — évite de bouger Hero/boutons absolus.
  const rowScroller = el.closest<HTMLElement>("[data-row-scroller]");
  if (rowScroller) {
    try {
      const tr = el.getBoundingClientRect();
      const pr = rowScroller.getBoundingClientRect();
      const targetCenter = tr.left + tr.width / 2;
      const parentCenter = pr.left + pr.width / 2;
      rowScroller.scrollBy({ left: targetCenter - parentCenter, behavior: "smooth" });
      return;
    } catch {}
  }

  // Vertical scroll de la page uniquement si vraiment nécessaire (block:nearest minimise)
  try {
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  } catch {
    el.scrollIntoView();
  }
}

function focusFirstVisible(): boolean {
  const all = collectFocusable();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const visible = all.filter(
    (c) => c.rect.top >= 0 && c.rect.bottom <= vh && c.rect.left >= 0 && c.rect.right <= vw,
  );
  const target = (visible[0] ?? all[0])?.el;
  if (target) {
    target.focus();
    ensureVisible(target);
    return true;
  }
  return false;
}

function moveFocus(dir: Direction): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return focusFirstVisible();
  const trap = findTrapContainer(active);
  const root: HTMLElement | Document = trap ?? document;
  const all = collectFocusable(root);
  const origin = all.find((f) => f.el === active);
  if (!origin) return focusFirstVisible();
  const next = pickBest(origin, all, dir);
  if (next) {
    next.focus();
    ensureVisible(next);
    return true;
  }
  return false;
}

function activateActive(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return false;
  active.click();
  return true;
}

function goBack(): boolean {
  const active = document.activeElement as HTMLElement | null;
  const trap = findTrapContainer(active);
  if (trap) {
    const closeBtn = trap.querySelector<HTMLElement>(
      '[data-tv-close], button[aria-label*="ermer" i], button[aria-label*="lose" i]',
    );
    if (closeBtn) {
      closeBtn.click();
      return true;
    }
  }
  if (window.history.length > 1) {
    window.history.back();
    return true;
  }
  return false;
}

function onKeyDown(e: KeyboardEvent) {
  if (!document.documentElement.classList.contains("tv")) return;
  const target = e.target as HTMLElement | null;
  const isEditable =
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  const k = e.key;
  const tryAction = (action: TVKeyAction, fn: () => boolean) => {
    if (!matchTVKey(k, action)) return false;
    const handled = fn();
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
    return true;
  };
  if (e.defaultPrevented) return;
  const keepH =
    target?.hasAttribute("data-tv-keep-horizontal") ||
    target?.closest("[data-tv-keep-horizontal]");
  if (!isEditable) {
    if (tryAction("UP", () => moveFocus("UP"))) return;
    if (tryAction("DOWN", () => moveFocus("DOWN"))) return;
    if (!keepH) {
      if (tryAction("LEFT", () => moveFocus("LEFT"))) return;
      if (tryAction("RIGHT", () => moveFocus("RIGHT"))) return;
    }
  }
  if (tryAction("ENTER", activateActive)) return;
  if (tryAction("BACK", goBack)) return;
}

let installed = false;

export function installSpatialNav() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;
  window.addEventListener("keydown", onKeyDown);
}

export function uninstallSpatialNav() {
  if (!installed) return;
  installed = false;
  window.removeEventListener("keydown", onKeyDown);
}

export function useSpatialNav() {
  useEffect(() => {
    installSpatialNav();
    const t = window.setTimeout(() => {
      if (document.activeElement === document.body) focusFirstVisible();
    }, 200);
    return () => {
      window.clearTimeout(t);
    };
  }, []);
}
