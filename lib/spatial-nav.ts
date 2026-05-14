// LARAPLAY — Spatial Navigation D-pad TV (V2 row-focus model).
// Inspiré Netflix TV: sections verticales avec UN focusable actif chacune.
// LEFT/RIGHT déplace dans section, UP/DOWN saute entre sections.
// Mémoire par section: revenant à une section restaure dernier chip focused.
// Pas de calcul géométrique fragile → robuste cross-TV.

"use client";

import { useEffect } from "react";
import { matchTVKeyEvent } from "./tv";

// Sections = conteneurs marqués `data-tv-section`. Ordre DOM = ordre vertical.
// Chaque section contient des focusables (button, a[href]) marqués naturellement.
// Le composant child onFocus handler peut faire scroll local (déjà en place sur cards).

const SECTION_ATTR = "data-tv-section";
const FOCUSABLE_SELECTOR = [
  "a[href]:not([data-no-focus]):not([aria-hidden='true']):not([tabindex='-1'])",
  "button:not([disabled]):not([data-no-focus]):not([aria-hidden='true']):not([tabindex='-1'])",
  "[data-focusable]:not([data-no-focus])",
  "input:not([disabled]):not([type='hidden'])",
].join(",");

// Mémoire focus par section (clé = section element)
const SECTION_MEMORY = new WeakMap<HTMLElement, HTMLElement>();

function isTV(): boolean {
  return document.documentElement.classList.contains("tv");
}

function visibleFocusables(root: HTMLElement | Document = document): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.hidden) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    return true;
  });
}

function sectionOf(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    if (node.hasAttribute(SECTION_ATTR)) return node;
    node = node.parentElement;
  }
  return null;
}

function allSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${SECTION_ATTR}]`)).filter(
    (s) => {
      const cs = window.getComputedStyle(s);
      return cs.display !== "none" && cs.visibility !== "hidden";
    }
  );
}

function focusableInSection(section: HTMLElement): HTMLElement[] {
  return visibleFocusables(section);
}

/** Focus un élément + mémorise dans sa section + scroll horizontal local si dans row scroller */
function focusEl(el: HTMLElement) {
  el.focus({ preventScroll: true });
  const sec = sectionOf(el);
  if (sec) SECTION_MEMORY.set(sec, el);
  // Scroll horizontal local (row scroller) sans bouger page
  const rowScroller = el.closest<HTMLElement>("[data-row-scroller]");
  if (rowScroller) {
    try {
      const tr = el.getBoundingClientRect();
      const pr = rowScroller.getBoundingClientRect();
      const targetCenter = tr.left + tr.width / 2;
      const parentCenter = pr.left + pr.width / 2;
      rowScroller.scrollBy({ left: targetCenter - parentCenter, behavior: "smooth" });
    } catch {}
  }
  // Scroll vertical section dans viewport si hors verticalement
  const sec2 = sectionOf(el);
  if (sec2) {
    const sr = sec2.getBoundingClientRect();
    const vh = window.innerHeight;
    if (sr.top < 0 || sr.bottom > vh) {
      try {
        sec2.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {}
    }
  }
}

function moveHorizontal(dir: "LEFT" | "RIGHT"): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return focusInitial();
  const sec = sectionOf(active);
  if (!sec) return false;
  const items = focusableInSection(sec);
  if (items.length === 0) return false;
  const idx = items.indexOf(active);
  if (idx < 0) {
    // Active hors section actuelle — focus premier
    focusEl(items[0]);
    return true;
  }
  const next = dir === "RIGHT" ? items[idx + 1] : items[idx - 1];
  if (next) {
    focusEl(next);
    return true;
  }
  // Bord atteint: stay (pas wrap, pas saute section)
  return true;
}

function moveVertical(dir: "UP" | "DOWN"): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return focusInitial();
  const sec = sectionOf(active);
  if (!sec) return focusInitial();

  const sections = allSections();
  const idx = sections.indexOf(sec);
  if (idx < 0) return focusInitial();

  const nextSec = dir === "DOWN" ? sections[idx + 1] : sections[idx - 1];
  if (!nextSec) return true; // Bord atteint

  // Restaure mémoire ou prend premier focusable
  const memory = SECTION_MEMORY.get(nextSec);
  if (memory && nextSec.contains(memory) && document.contains(memory)) {
    focusEl(memory);
    return true;
  }
  const items = focusableInSection(nextSec);
  if (items.length > 0) {
    focusEl(items[0]);
    return true;
  }
  return true;
}

function focusInitial(): boolean {
  const sections = allSections();
  for (const sec of sections) {
    const items = focusableInSection(sec);
    if (items.length > 0) {
      focusEl(items[0]);
      return true;
    }
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
  // Modal/trap close si présent
  const active = document.activeElement as HTMLElement | null;
  const trap = active?.closest<HTMLElement>("[data-tv-trap='modal']");
  if (trap) {
    const closeBtn = trap.querySelector<HTMLElement>(
      '[data-tv-close], button[aria-label*="ermer" i], button[aria-label*="lose" i]'
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
  if (!isTV()) return;
  if (e.defaultPrevented) return;

  const target = e.target as HTMLElement | null;
  const isEditable =
    target &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

  if (!isEditable) {
    if (matchTVKeyEvent(e, "UP")) {
      if (moveVertical("UP")) { e.preventDefault(); return; }
    }
    if (matchTVKeyEvent(e, "DOWN")) {
      if (moveVertical("DOWN")) { e.preventDefault(); return; }
    }
    if (matchTVKeyEvent(e, "LEFT")) {
      if (moveHorizontal("LEFT")) { e.preventDefault(); return; }
    }
    if (matchTVKeyEvent(e, "RIGHT")) {
      if (moveHorizontal("RIGHT")) { e.preventDefault(); return; }
    }
  }
  if (matchTVKeyEvent(e, "ENTER")) {
    if (activateActive()) { e.preventDefault(); return; }
  }
  if (matchTVKeyEvent(e, "BACK")) {
    if (goBack()) { e.preventDefault(); return; }
  }
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
    // Focus initial après DOM stable (purge + render complet)
    const t = window.setTimeout(() => {
      if (!isTV()) return;
      if (document.activeElement === document.body) focusInitial();
    }, 600);
    return () => window.clearTimeout(t);
  }, []);
}
