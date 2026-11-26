import { useLayoutEffect, type RefObject } from "react";
import { reducedMotion } from "../demo/motion";

/**
 * The sliding indicator under tabs and segments. The row (its
 * container) draws the chosen tab's background, or its underline, as
 * one shape of its own (a ::before, styles in theme/shell-motion.css),
 * and that shape glides from the old tab to the new one: a transform
 * only (FLIP, translate and scale), on the --spring timing (420 ms).
 *
 * - The chosen tab is whichever child says so: aria-current="page",
 *   aria-selected="true" or aria-pressed="true". A change of that
 *   attribute is seen by a MutationObserver, so the components only
 *   pass a ref; they keep their own state as before.
 * - Interruptible: a new choice mid-glide starts from where the shape
 *   is on screen, not from where it was going.
 * - It snaps, never glides, on its first frame, when the tabs
 *   themselves change (a role or language change), when a tab resizes
 *   (fonts landing, a resize) and under reduced motion.
 * - Without JS the tab's own background stays (the row only drops it
 *   once `data-glide` is set).
 */
export type GlideKind = "pill" | "seg" | "line";

const CHOSEN = ":is([aria-current='page'], [aria-selected='true'], " +
  "[aria-pressed='true'])";
const WATCH = ["aria-current", "aria-selected", "aria-pressed"];
const LINE = 2;

interface Box { x: number; y: number; w: number; h: number }

/** A time token from theme/motion.css, in ms (its fallback if unset). */
export function tokenMs(name: string, fallback: number): number {
  if (typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

/** An easing token from theme/motion.css (its fallback if unset). */
export function tokenEase(name: string, fallback: string): string {
  if (typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
  return v === "" ? fallback : v;
}

/** `el`'s box in `root`'s content coordinates (scroll and zoom free). */
function boxIn(root: HTMLElement, el: HTMLElement, kind: GlideKind): Box {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n !== null && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const up: Element | null = n.offsetParent;
    n = up instanceof HTMLElement ? up : null;
  }
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  return kind === "line" ? { x, y: y + h - LINE, w, h: LINE }
    : { x, y, w, h };
}

const same = (a: Box, b: Box): boolean => Math.abs(a.x - b.x) < 0.5 &&
  Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 &&
  Math.abs(a.h - b.h) < 0.5;

/** Where the shape is on screen now (mid-glide or at rest). */
function shownBox(root: HTMLElement, at: Box): Box {
  const m = new DOMMatrixReadOnly(
    getComputedStyle(root, "::before").transform === "none" ? undefined
      : getComputedStyle(root, "::before").transform);
  return { x: m.e, y: m.f, w: at.w * m.a, h: at.h * m.d };
}

/** Gives the row at `ref` a gliding indicator of `kind`. */
export function useGlide(ref: RefObject<HTMLElement | null>,
  kind: GlideKind): void {
  useLayoutEffect(() => {
    const root = ref.current;
    if (root === null || typeof MutationObserver !== "function") {
      return undefined;
    }
    let at: Box | null = null;
    let tab: HTMLElement | null = null;
    const sized = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => sync(false)) : null;
    const put = (b: Box): void => {
      root.style.setProperty("--glide-x", `${b.x}px`);
      root.style.setProperty("--glide-y", `${b.y}px`);
      root.style.setProperty("--glide-w", `${b.w}px`);
      root.style.setProperty("--glide-h", `${b.h}px`);
    };
    const sync = (glide: boolean): void => {
      const el = root.querySelector<HTMLElement>(CHOSEN);
      if (el !== tab) {
        if (tab !== null) sized?.unobserve(tab);
        if (el !== null) sized?.observe(el);
        tab = el;
      }
      if (el === null) {
        root.dataset["glideOn"] = "false";
        at = null;
        return;
      }
      const next = boxIn(root, el, kind);
      if (at !== null && same(at, next)) return;
      const running = root.getAnimations({ subtree: true }).filter((a) =>
        (a.effect as KeyframeEffect | null)?.pseudoElement === "::before");
      const from = glide && at !== null && !reducedMotion()
        ? shownBox(root, at) : null;
      running.forEach((a) => a.cancel());
      put(next);
      root.dataset["glideOn"] = "true";
      at = next;
      if (from === null || same(from, next) || next.w === 0) return;
      const sx = from.w / next.w;
      const sy = next.h === 0 ? 1 : from.h / next.h;
      root.animate([
        { transform: `translate(${from.x}px, ${from.y}px) ` +
          `scale(${sx}, ${sy})` },
        { transform: `translate(${next.x}px, ${next.y}px)` },
      ], { duration: tokenMs("--dur-spring", 420),
        easing: tokenEase("--ease-spring", "cubic-bezier(0.22,1.2,0.36,1)"),
        pseudoElement: "::before" });
    };
    root.dataset["glide"] = kind;
    sync(false);
    const seen = new MutationObserver((records) => {
      // New tabs (a role or language change) snap; a new choice glides.
      sync(!records.some((r) => r.type === "childList"));
    });
    seen.observe(root, { subtree: true, childList: true,
      attributes: true, attributeFilter: WATCH });
    if (sized !== null) sized.observe(root);
    void document.fonts?.ready.then(() => sync(false));
    return () => {
      seen.disconnect();
      sized?.disconnect();
      delete root.dataset["glide"];
      delete root.dataset["glideOn"];
    };
  }, [ref, kind]);
}
