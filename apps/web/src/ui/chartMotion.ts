import { useLayoutEffect, useRef, type RefObject } from "react";
import { reducedMotion } from "../demo/motion";
import { FAIL_OPEN_MS, onSeen } from "./seen";

/**
 * Data in motion for every chart, on WAAPI only (so a capture can
 * pause and step document.getAnimations()). A chart marks its parts:
 *
 * - `data-mark` + `data-key`: a bar or step. It grows from its zero
 *   edge (`data-grow` "y" or "x", `data-origin` a transform-origin,
 *   default the bottom or the inline start).
 * - `data-line` + `data-key`: a path drawn with pathLength 1 and
 *   stroke-dasharray 1; it draws in from its start.
 * - `data-label`: values and labels; they fade in once the marks are
 *   up, and again after a data change.
 *
 * Entrance: once per mount, when the chart first scrolls into view
 * (built paused at frame 0 straight away, so the full chart never
 * flashes first). Marks take the hero duration with STAGGER between
 * them, lines the hero duration, labels the base duration after.
 *
 * A data change (`dataKey`) tweens instead of replaying: each mark
 * moves and scales from where it was (FLIP, by data-key), a line
 * morphs its path when the point count is the same (else it draws in
 * again), new marks grow, labels fade back. A width change is
 * neither: the chart simply lays out again.
 *
 * Reduced motion: none of it; the end state is drawn at once.
 */

const tok = (name: string, ms: number): number => {
  if (typeof document === "undefined") return ms;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) && v.endsWith("ms") ? n : ms;
};

/** The brief's tokens, read live (m1's motion.css) with fallbacks. */
export const motion = {
  get base() { return tok("--dur-base", 200); },
  get slow() { return tok("--dur-slow", 320); },
  get hero() { return tok("--dur-hero", 480); },
  get ease() {
    if (typeof document === "undefined") return EASE;
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-out").trim();
    return v === "" ? EASE : v;
  },
};
const EASE = "cubic-bezier(0.2, 0, 0, 1)";
/** Delay between marks on entrance, ms. */
export const STAGGER = 30;

interface Geo {
  x: number;
  y: number;
  w: number;
  h: number;
  d?: string;
}

function geoOf(el: Element, root: Element): Geo {
  if (el instanceof SVGGraphicsElement) {
    const b = el.getBBox();
    const d = el.getAttribute("d") ?? undefined;
    return { x: b.x, y: b.y, w: b.width, h: b.height,
      ...(d === undefined ? {} : { d }) };
  }
  const r = el.getBoundingClientRect();
  const o = root.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
}

function snapshot(root: Element): Map<string, Geo> {
  const m = new Map<string, Geo>();
  for (const el of root.querySelectorAll<Element>(
    "[data-mark][data-key], [data-line][data-key]")) {
    m.set(el.getAttribute("data-key") ?? "", geoOf(el, root));
  }
  return m;
}

const commands = (d: string): string =>
  d.replace(/[^a-zA-Z]/g, "").toUpperCase();

function origin(el: HTMLElement | SVGElement): string {
  const o = el.dataset["origin"];
  if (o !== undefined) return o;
  if (el.dataset["grow"] !== "x") return "50% 100%";
  // A bar in a right-to-left page grows from its inline start, the
  // right (SVG charts are drawn left to right whatever the page).
  const rtl = el instanceof HTMLElement &&
    getComputedStyle(el).direction === "rtl";
  return rtl ? "100% 50%" : "0% 50%";
}

/**
 * From (almost) zero: Chromium draws an SVG element whose transform
 * cannot be inverted (a scale of exactly 0) as if untransformed.
 */
const ZERO = 0.001;

function growFrames(el: HTMLElement | SVGElement): Keyframe[] {
  const x = el.dataset["grow"] === "x";
  return [{ transform: x ? `scaleX(${ZERO})` : `scaleY(${ZERO})` },
    { transform: "none" }];
}

function prep(el: HTMLElement | SVGElement): void {
  el.style.transformBox = "fill-box";
  el.style.transformOrigin = origin(el);
}

/** Entrance, built paused. Returns the animations. */
function entrance(root: Element, stagger: number,
  duration?: number): Animation[] {
  const out: Animation[] = [];
  const marks = [...root.querySelectorAll<HTMLElement | SVGElement>(
    "[data-mark]")];
  const hero = duration ?? motion.hero;
  const ease = motion.ease;
  marks.forEach((el, i) => {
    prep(el);
    out.push(el.animate(growFrames(el), { duration: hero, delay: i * stagger,
      easing: ease, fill: "backwards" }));
  });
  for (const el of root.querySelectorAll<SVGElement>("[data-line]")) {
    out.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      { duration: hero, easing: ease, fill: "backwards" }));
  }
  const after = Math.max(hero, hero + (marks.length - 1) * stagger) - 80;
  root.querySelectorAll<HTMLElement | SVGElement>("[data-label]")
    .forEach((el, i) => {
      out.push(el.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: motion.base, delay: after + i * 12,
          easing: "linear", fill: "backwards" }));
    });
  for (const a of out) a.pause();
  return out;
}

/** The tween after a data change, from the geometry before it. */
function tween(root: Element, before: Map<string, Geo>): Animation[] {
  const out: Animation[] = [];
  const slow = motion.slow;
  const ease = motion.ease;
  const timing = { duration: slow, easing: ease };
  for (const el of root.querySelectorAll<HTMLElement | SVGElement>(
    "[data-mark]")) {
    const was = before.get(el.dataset["key"] ?? "");
    if (was === undefined) {
      prep(el);
      out.push(el.animate(growFrames(el), { ...timing, fill: "backwards" }));
      continue;
    }
    const now = geoOf(el, root);
    if (now.w === 0 || now.h === 0) continue;
    const dx = was.x - now.x;
    const dy = was.y - now.y;
    const sx = Math.max(was.w, 0.001) / now.w;
    const sy = Math.max(was.h, 0.001) / now.h;
    if (Math.abs(dx) + Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.002 &&
      Math.abs(sy - 1) < 0.002) continue;
    el.style.transformBox = "fill-box";
    el.style.transformOrigin = "0 0";
    out.push(el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: "none" }], timing));
  }
  for (const el of root.querySelectorAll<SVGElement>("[data-line]")) {
    const was = before.get(el.dataset["key"] ?? "")?.d;
    const now = el.getAttribute("d") ?? "";
    if (was === undefined || was === now) continue;
    if (commands(was) === commands(now)) {
      out.push(el.animate([{ d: `path("${was}")` }, { d: `path("${now}")` }],
        timing));
    } else {
      out.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { ...timing, duration: motion.hero, fill: "backwards" }));
    }
  }
  for (const el of root.querySelectorAll<HTMLElement | SVGElement>(
    "[data-label]")) {
    out.push(el.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: motion.base, delay: slow * 0.6, easing: "linear",
        fill: "backwards" }));
  }
  return out;
}

/** Charts that have already entered this session (`opts.session`). */
const enteredOnce = new Set<string>();

/**
 * Runs a chart's entrance once it is in view and tweens it on data
 * change. `ready` is false until the chart has its width.
 */
export function useChartMotion(root: RefObject<Element | null>,
  dataKey: string, ready = true,
  opts: { stagger?: number; duration?: number;
    /** A chart's own entrance (the waterfall's), built here paused. */
    entrance?: (root: Element) => Animation[];
    /** Enter once per session under this key: a role switch or a
     * return to the page shows the finished chart. */
    session?: string } = {}): void {
  const geo = useRef<Map<string, Geo>>(new Map());
  const entered = useRef(false);
  const lastKey = useRef(dataKey);
  const running = useRef<Animation[]>([]);
  // Entrance: once per mount.
  useLayoutEffect(() => {
    const el = root.current;
    if (el === null || !ready || entered.current) return undefined;
    entered.current = true;
    if (reducedMotion()) return undefined;
    if (opts.session !== undefined && enteredOnce.has(opts.session)) {
      return undefined;
    }
    const anims = opts.entrance === undefined
      ? entrance(el, opts.stagger ?? STAGGER, opts.duration)
      : opts.entrance(el);
    for (const a of anims) a.pause();
    const go = (): void => {
      if (opts.session !== undefined) enteredOnce.add(opts.session);
      for (const a of anims) a.play();
      // Fail-open: whatever has not ended by then jumps to its end.
      setTimeout(() => {
        for (const a of anims) {
          if (a.playState !== "running" && a.playState !== "paused") continue;
          try {
            a.finish();
          } catch {
            // An endless effect cannot finish; it was only decoration.
          }
        }
      }, motion.hero * 3 + FAIL_OPEN_MS);
    };
    // The observer where it reports; else a scroll and timer check
    // (ui/seen.ts): a chart never stays paused at its first frame.
    const stop = onSeen([el], go, { threshold: 0.15 });
    return () => {
      // Unmounted (or React's dev double run): start over next time.
      entered.current = false;
      stop();
      for (const a of anims) a.cancel();
    };
  }, [ready]);
  // Data change: tween from the last geometry; then remember this one.
  useLayoutEffect(() => {
    const el = root.current;
    if (el === null || !ready) return;
    if (lastKey.current !== dataKey && geo.current.size > 0 &&
      !reducedMotion()) {
      for (const a of running.current) a.cancel();
      running.current = tween(el, geo.current);
    }
    lastKey.current = dataKey;
  });
  // Read after the frame, not in it: getBBox forces a layout, and on a
  // page's first render (inside the route transition, which paints
  // nothing until the render is done) that held the first answer.
  // The next data change commits later, so it still tweens from here.
  const pending = useRef(0);
  useLayoutEffect(() => {
    const el = root.current;
    if (el === null || !ready) return;
    if (typeof requestAnimationFrame !== "function") {
      geo.current = snapshot(el);
      return;
    }
    cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => {
      if (root.current !== null) geo.current = snapshot(root.current);
    });
  });
  useLayoutEffect(() => () => cancelAnimationFrame(pending.current), []);
}
