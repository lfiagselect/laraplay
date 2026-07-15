// LARAPLAY — Spatial Navigation D-pad TV (V3 geometric model).
// NAV-02/03 : cible géométrique la plus proche, sections vides sautées,
// data-tv-keep-horizontal respecté, champs éditables laissés à l'IME,
// une pression = un mouvement (verrou anti key-repeat),
// Return hiérarchique (modale → lecteur → historique).

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
const MOVE_LOCK_MS = 150;
let lastMoveAt = 0;

function isTV(): boolean {
  return document.documentElement.classList.contains("tv");
}

/** PLAYER-02 : visibilité vérifiée sur l'élément ET sa chaîne d'ancêtres. */
function isActuallyVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  let node: HTMLElement | null = el;
  let depth = 0;
  while (node && node !== document.body && depth < 12) {
    const cs = window.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    node = node.parentElement;
    depth++;
  }
  return true;
}

function visibleFocusables(root: HTMLElement | Document = document): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter(isActuallyVisible);
}

function sectionOf(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    if (node.hasAttribute(SECTION_ATTR)) return node;
    node = node.parentElement;
  }
  return null;
}

function allSections(root: HTMLElement | Document = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${SECTION_ATTR}]`)).filter(
    (s) => {
      const cs = window.getComputedStyle(s);
      return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
    }
  );
}

function focusableInSection(section: HTMLElement): HTMLElement[] {
  const descendants = visibleFocusables(section);
  if (section.matches(FOCUSABLE_SELECTOR) && isActuallyVisible(section)) {
    return [section, ...descendants];
  }
  return descendants;
}

/** Portée de navigation : modale ouverte (trap) = graphe restreint à la modale. */
function navRoot(active: HTMLElement | null): HTMLElement | Document {
  return (
    active?.closest<HTMLElement>("[data-tv-trap]") ??
    document.querySelector<HTMLElement>("[data-tv-trap]") ??
    document
  );
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
  if (sec) {
    const sr = sec.getBoundingClientRect();
    const vh = window.innerHeight;
    if (sr.top < 0 || sr.bottom > vh) {
      try {
        sec.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        sec.scrollIntoView();
      }
    }
  }
}

function center(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Cible géométrique : candidats dans le demi-plan demandé,
 * score = distance axe principal + 0.35 × distance axe secondaire.
 */
function nearestInDirection(
  from: HTMLElement,
  dir: "UP" | "DOWN" | "LEFT" | "RIGHT",
  candidates: HTMLElement[],
): HTMLElement | null {
  const c = center(from);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of candidates) {
    if (el === from) continue;
    const p = center(el);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    let primary: number, secondary: number;
    switch (dir) {
      case "UP": if (dy >= -4) continue; primary = -dy; secondary = Math.abs(dx); break;
      case "DOWN": if (dy <= 4) continue; primary = dy; secondary = Math.abs(dx); break;
      case "LEFT": if (dx >= -4) continue; primary = -dx; secondary = Math.abs(dy); break;
      case "RIGHT": if (dx <= 4) continue; primary = dx; secondary = Math.abs(dy); break;
    }
    const score = primary + 0.35 * secondary;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function closestHorizontal(from: HTMLElement, candidates: HTMLElement[]): HTMLElement | null {
  if (candidates.length === 0) return null;
  const sourceX = center(from).x;
  let best = candidates[0];
  let bestDistance = Math.abs(center(best).x - sourceX);
  for (let i = 1; i < candidates.length; i++) {
    const distance = Math.abs(center(candidates[i]).x - sourceX);
    if (distance < bestDistance) {
      best = candidates[i];
      bestDistance = distance;
    }
  }
  return best;
}

function adjacentSection(
  current: HTMLElement,
  dir: "UP" | "DOWN",
  root: HTMLElement | Document,
): HTMLElement | null {
  const currentRect = current.getBoundingClientRect();
  const currentY = currentRect.top + currentRect.height / 2;
  const sections = allSections(root)
    .filter((section) => section !== current && focusableInSection(section).length > 0)
    .map((section) => {
      const rect = section.getBoundingClientRect();
      return { section, y: rect.top + rect.height / 2 };
    })
    .filter(({ y }) => dir === "DOWN" ? y > currentY + 4 : y < currentY - 4)
    .sort((a, b) => Math.abs(a.y - currentY) - Math.abs(b.y - currentY));

  return sections.length > 0 ? sections[0].section : null;
}

function moveHorizontal(dir: "LEFT" | "RIGHT"): boolean {
  const active = activeFocusable();
  if (!active) return focusInitial();
  // Le composant (slider…) gère lui-même Gauche/Droite : ne pas doubler.
  if (active.closest("[data-tv-keep-horizontal]")) return false;
  const sec = sectionOf(active);
  if (!sec) return false;
  const rowScroller = active.closest<HTMLElement>("[data-row-scroller]");
  if (rowScroller) {
    // Rangée linéaire : ordre DOM (mémoire de position déjà gérée).
    const items = visibleFocusables(rowScroller);
    if (items.length === 0) return false;
    let idx = items.indexOf(active);
    if (idx < 0) idx = dir === "RIGHT" ? -1 : items.length;
    const nextIndex = dir === "RIGHT" ? idx + 1 : idx - 1;
    if (nextIndex < 0 || nextIndex >= items.length) return true; // bord : touche absorbée
    focusEl(items[nextIndex]);
    return true;
  }
  // Grille / groupe : géométrique dans la section.
  const target = nearestInDirection(active, dir, focusableInSection(sec));
  if (!target) return true; // bord de section : absorbé (pas de fuite header)
  focusEl(target);
  return true;
}

function moveVertical(dir: "UP" | "DOWN"): boolean {
  const active = activeFocusable();
  if (!active) return focusInitial();
  const root = navRoot(active);
  const sec = sectionOf(active);
  if (!sec) {
    // Focusable orphelin : rejoindre le graphe au plus proche.
    const target = nearestInDirection(active, dir, visibleFocusables(root));
    if (!target) return false;
    focusEl(target);
    return true;
  }

  // 1. D'abord dans la même section (grille 2D : descendre d'une ligne).
  const inSection = nearestInDirection(active, dir, focusableInSection(sec));
  if (inSection && sectionOf(inSection) === sec) {
    focusEl(inSection);
    return true;
  }

  // 2. Sinon, section visuelle adjacente. On évite le scan global qui pouvait
  // sauter plusieurs rangées et forcer des milliers de mesures de layout.
  const targetSec = adjacentSection(sec, dir, root);
  if (!targetSec) return false;
  if (targetSec) {
    const memory = SECTION_MEMORY.get(targetSec);
    if (memory && targetSec.contains(memory) && document.contains(memory) && isActuallyVisible(memory)) {
      focusEl(memory);
      return true;
    }
  }
  const target = closestHorizontal(active, focusableInSection(targetSec));
  if (!target) return false;
  focusEl(target);
  return true;
}

export function focusInitial(): boolean {
  const root = navRoot(null);
  const explicit = root.querySelector<HTMLElement>("[data-tv-initial]");
  if (explicit && isActuallyVisible(explicit) && explicit.matches(FOCUSABLE_SELECTOR)) {
    focusEl(explicit);
    return true;
  }

  const sections = allSections(root);
  for (const sec of sections) {
    const items = focusableInSection(sec);
    if (items.length > 0) {
      focusEl(items[0]);
      return true;
    }
  }
  // Aucune section : premier focusable visible (page non annotée).
  const any = visibleFocusables(root);
  if (any.length > 0) {
    focusEl(any[0]);
    return true;
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
  // 1. Modale / overlay ouverte : Return ferme d'abord (checklist Samsung S2).
  const anyTrap = document.querySelector<HTMLElement>("[data-tv-trap]");
  const trap = active?.closest<HTMLElement>("[data-tv-trap]") ?? anyTrap;
  if (trap) {
    const closeBtn = trap.querySelector<HTMLElement>(
      '[data-tv-close], button[aria-label*="ermer" i], button[aria-label*="lose" i]'
    );
    if (closeBtn) {
      closeBtn.click();
      return true;
    }
  }
  // 2. Lecteur : bouton retour explicite (backHref respecté).
  const playerBack = document.querySelector<HTMLElement>("[data-tv-back]");
  if (playerBack && isActuallyVisible(playerBack)) {
    playerBack.click();
    return true;
  }
  // À l'accueil, laisser le système du téléviseur gérer Retour/Exit.
  if (window.location.pathname === "/") return false;
  // 3. Hiérarchie navigateur.
  if (window.history.length > 1) {
    window.history.back();
    return true;
  }
  return false;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function onKeyDown(e: KeyboardEvent) {
  if (!isTV()) return;
  if (e.defaultPrevented) return;

  // Dans un champ simple, gauche/droite, saisie, Enter et Backspace restent à
  // l'IME. Haut/Bas permettent toutefois de rejoindre les autres sections TV;
  // les vraies touches Retour TV (hors Backspace) gardent leur hiérarchie.
  if (isEditableTarget(e.target)) {
    if (e.isComposing) return;
    const vertical = matchTVKeyEvent(e, "UP") || matchTVKeyEvent(e, "DOWN");
    const remoteBack = matchTVKeyEvent(e, "BACK") && e.key !== "Backspace" && e.keyCode !== 8;
    if (!vertical && !remoteBack) return;
  }

  const isMove =
    matchTVKeyEvent(e, "UP") || matchTVKeyEvent(e, "DOWN") ||
    matchTVKeyEvent(e, "LEFT") || matchTVKeyEvent(e, "RIGHT");

  if (isMove) {
    // Verrou anti key-repeat : une pression = un mouvement.
    const now = Date.now();
    if (now - lastMoveAt < MOVE_LOCK_MS) {
      e.preventDefault();
      return;
    }
    let handled = false;
    if (matchTVKeyEvent(e, "UP")) handled = moveVertical("UP");
    else if (matchTVKeyEvent(e, "DOWN")) handled = moveVertical("DOWN");
    else if (matchTVKeyEvent(e, "LEFT")) handled = moveHorizontal("LEFT");
    else if (matchTVKeyEvent(e, "RIGHT")) handled = moveHorizontal("RIGHT");
    if (handled) {
      lastMoveAt = now;
      e.preventDefault();
    }
    return;
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
