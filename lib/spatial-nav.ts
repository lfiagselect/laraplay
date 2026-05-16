// LARAPLAY — Spatial Navigation D-pad TV (V2 row-focus model).

"use client";

import { useEffect } from "react";
import { matchTVKeyEvent } from "./tv";

const SECTION_ATTR = "data-tv-section";
const FOCUSABLE_SELECTOR = [
  "a[href]:not([data-no-focus]):not([aria-hidden='true']):not([tabindex='-1'])",
  "button:not([disabled]):not([data-no-focus]):not([aria-hidden='true']):not([tabindex='-1'])",
  "[data-focusable]:not([data-no-focus])",
  "input:not([disabled]):not([type='hidden'])",
].join(",");

const SECTION_MEMORY = new WeakMap<HTMLElement, HTMLElement>();

function isTV(): boolean {
  return document.documentElement.classList.contains("tv");
}

function visibleFocusables(root: HTMLElement | Document = document): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.hidden) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
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

function activeFocusable(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return null;
  if (active.matches(FOCUSABLE_SELECTOR)) return active;
  return active.closest<HTMLElement>(FOCUSABLE_SELECTOR);
}

function centerInRow(el: HTMLElement, rowScroller: HTMLElement) {
  const tr = el.getBoundingClientRect();
  const pr = rowScroller.getBoundingClientRect();
  const delta = (tr.left + tr.width / 2) - (pr.left + pr.width / 2);
  const targetLeft = rowScroller.scrollLeft + delta;
  try {
    if (typeof rowScroller.scrollTo === "function") {
      rowScroller.scrollTo({ left: targetLeft, behavior: "smooth" });
    } else {
      rowScroller.scrollLeft = targetLeft;
    }
  } catch {
    rowScroller.scrollLeft = targetLeft;
  }
}

function focusEl(el: HTMLElement) {
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  const sec = sectionOf(el);
  if (sec) SECTION_MEMORY.set(sec, el);
  const rowScroller = el.closest<HTMLElement>("[data-row-scroller]");
  if (rowScroller) {
    try { centerInRow(el, rowScroller); } catch {}
  }
  const sec2 = sectionOf(el);
  if (sec2) {
    const sr = sec2.getBoundingClientRect();
    const vh = window.innerHeight;
    if (sr.top < 0 || sr.bottom > vh) {
      try {
        sec2.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        sec2.scrollIntoView();
      }
    }
  }
}

function moveHorizontal(dir: "LEFT" | "RIGHT"): boolean {
  const active = activeFocusable();
  if (!active) return focusInitial();
  const sec = sectionOf(active);
  if (!sec) return false;
  const rowScroller = active.closest<HTMLElement>("[data-row-scroller]");
  const items = rowScroller ? visibleFocusables(rowScroller) : focusableInSection(sec);
  if (items.length === 0) return false;
  let idx = items.indexOf(active);
  if (idx < 0) {
    idx = dir === "RIGHT" ? -1 : items.length;
  }
  const nextIndex = dir === "RIGHT" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
  focusEl(items[nextIndex]);
  return true;
}

function moveVertical(dir: "UP" | "DOWN"): boolean {
  const active = activeFocusable();
  if (!active) return focusInitial();
  const sec = sectionOf(active);
  if (!sec) return focusInitial();
  const sections = allSections();
  const idx = sections.indexOf(sec);
  if (idx < 0) return focusInitial();
  const nextSec = dir === "DOWN" ? sections[idx + 1] : sections[idx - 1];
  if (!nextSec) return true;
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
  const active = activeFocusable();
  if (!active) return false;
  active.click();
  return true;
}

function goBack(): boolean {
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
  window.addEventListener("keydown", onKeyDown, true);
}

export function uninstallSpatialNav() {
  if (!installed) return;
  installed = false;
  window.removeEventListener("keydown", onKeyDown, true);
}

export function useSpatialNav() {
  useEffect(() => {
    installSpatialNav();
    const t = window.setTimeout(() => {
      if (!isTV()) return;
      if (document.activeElement === document.body) focusInitial();
    }, 600);
    return () => window.clearTimeout(t);
  }, []);
}
