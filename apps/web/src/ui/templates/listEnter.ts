import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * List motion inside a page (listMotion.ts moves between pages):
 *
 * - Entrance: the rows, cards and tiles in view rise in, 40 ms apart,
 *   the first 12 only (the rest arrive with the twelfth). Once per
 *   route in a session, never on a re-render, never on the way back
 *   from a record (that trip has its own shared-element motion).
 * - Reveal: report sections and dashboard panels below the fold wait
 *   hidden and rise in once as they scroll into view.
 * - Reflow (FLIP): when a filter, a search or a decision changes which
 *   rows show, the rows that stay slide to their new places, new rows
 *   fade in, and a row that leaves fades where it stood while the
 *   rows below slide up over it. Measured from the screen, so a change
 *   in the middle of a slide carries on from where the row is.
 *
 * Transform and opacity only. Fades are veils (a layer in the colour
 * behind fades off the element), so text is never drawn half-faded.
 * Durations come from the motion tokens (theme), read at run time,
 * with the agreed values as fallbacks.
 * Reduced motion: nothing moves and nothing waits hidden.
 */

export const STAGGER_MS = 40;
export const STAGGER_CAP = 12;

const FALLBACK: Record<string, number> = {
  "--dur-fast": 120, "--dur-base": 200, "--dur-slow": 320,
  "--dur-hero": 480,
};
const EASE_FALLBACK = "cubic-bezier(0.2,0,0,1)";

/** A duration token in ms (the theme's value, else the fallback). */
export function dur(token: keyof typeof FALLBACK | string): number {
  const fb = FALLBACK[token] ?? 200;
  if (typeof getComputedStyle !== "function") return fb;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(token).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fb;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

/** The ease-out token (the theme's value, else the fallback). */
export function easeOut(): string {
  if (typeof getComputedStyle !== "function") return EASE_FALLBACK;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--ease-out").trim();
  return v === "" ? EASE_FALLBACK : v;
}

/** Read on each use: the person can change it while the page is open. */
export function reduced(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const canAnimate = (): boolean => typeof Element !== "undefined" &&
  typeof Element.prototype.animate === "function";

/** The page zoom (1.2 on projector-size screens). */
function zoom(): number {
  return Number(getComputedStyle(document.documentElement)
    .getPropertyValue("zoom")) || 1;
}

/** The colour behind `el`: the first ancestor that paints one. */
function behind(el: HTMLElement): string {
  for (let p = el.parentElement; p !== null; p = p.parentElement) {
    const c = getComputedStyle(p).backgroundColor;
    if (c !== "" && c !== "transparent" && c !== "rgba(0, 0, 0, 0)") {
      return c;
    }
  }
  return getComputedStyle(document.body).backgroundColor;
}

/**
 * A veil: a layer in the colour behind `el`, drawn over it (::after,
 * motion.module.css), whose opacity animates. Text under it keeps full
 * contrast at every frame (a checker never reads a half-faded word);
 * the eye sees the element fade. `out` veils it instead of unveiling.
 */
export function veil(el: HTMLElement, o: { duration: number;
  delay?: number; easing?: string; out?: boolean }): Animation {
  el.style.setProperty("--veil", behind(el));
  el.dataset["veil"] = "";
  const kf = [{ opacity: 1 }, { opacity: 0 }];
  const a = el.animate(o.out === true ? [...kf].reverse() : kf, {
    duration: o.duration, delay: o.delay ?? 0,
    easing: o.easing ?? "linear", pseudoElement: "::after",
    fill: o.out === true ? "forwards" : "backwards" });
  const done = (): void => {
    if (o.out === true) return;
    if (el.getAnimations({ subtree: true }).some((x) => x !== a &&
      (x.effect as KeyframeEffect | null)?.pseudoElement === "::after")) {
      return;
    }
    delete el.dataset["veil"];
    el.style.removeProperty("--veil");
  };
  a.addEventListener("finish", done);
  a.addEventListener("cancel", done);
  return a;
}

const inView = (r: DOMRect): boolean =>
  r.bottom > 0 && r.top < innerHeight && r.height > 0;

/** Routes (and scopes) whose entrance has played this session. */
const played = new Set<string>();

/** For tests: forget which entrances have played. */
export function resetEntrances(): void {
  played.clear();
}

/** Coming back from a record to its list (listMotion): the list is
 * simply there, under the shared-element motion. */
const trip = (): boolean =>
  document.documentElement.dataset["listMotion"] === "back";

/**
 * Plays the entrance on `items` (in order). `fade` false moves only:
 * a tile's figures read at full contrast from the first frame.
 */
export function enter(items: HTMLElement[], fade = true): void {
  if (reduced() || !canAnimate()) return;
  const shown = items.filter((el) => inView(el.getBoundingClientRect()));
  const slow = dur("--dur-slow");
  const base = dur("--dur-base");
  const ease = easeOut();
  shown.forEach((el, i) => {
    const delay = Math.min(i, STAGGER_CAP - 1) * STAGGER_MS;
    el.animate([{ transform: "translateY(8px)" }, { transform: "none" }],
      { duration: slow, delay, easing: ease, fill: "backwards" });
    if (fade) veil(el, { duration: base, delay });
  });
}

/**
 * The first-load entrance for the items `selector` finds under `ref`,
 * once per route (and `scope`, when a page has several groups).
 */
export function useEntrance(ref: RefObject<HTMLElement | null>,
  selector: string, o: { scope: string; fade?: boolean }): void {
  useLayoutEffect(() => {
    const root = ref.current;
    if (root === null) return;
    const key = `${location.hash}|${o.scope}`;
    if (played.has(key)) return;
    played.add(key);
    if (trip()) return;
    enter([...root.querySelectorAll<HTMLElement>(selector)],
      o.fade !== false);
    // Mount only: a re-render never replays it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Reveal: each element `selector` finds under `ref` that starts below
 * the fold waits hidden (data-reveal="wait", set before the first
 * paint) and rises in once when it scrolls into view. Elements in view
 * at load are left alone. Print shows everything (motion.module.css).
 */
export function useReveal(ref: RefObject<HTMLElement | null>,
  selector: string): void {
  useLayoutEffect(() => {
    const root = ref.current;
    if (root === null || reduced() || !canAnimate() ||
      typeof IntersectionObserver !== "function") return undefined;
    const below = [...root.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => el.getBoundingClientRect().top > innerHeight);
    if (below.length === 0) return undefined;
    const show = (el: HTMLElement, animate: boolean): void => {
      if (el.dataset["reveal"] !== "wait") return;
      el.dataset["reveal"] = "done";
      if (!animate || reduced()) return;
      el.animate([{ transform: "translateY(16px)" }, { transform: "none" }],
        { duration: dur("--dur-slow"), easing: easeOut() });
      veil(el, { duration: dur("--dur-base") });
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        show(e.target as HTMLElement, true);
      });
    }, { rootMargin: "0px 0px 6% 0px" });
    below.forEach((el) => {
      el.dataset["reveal"] = "wait";
      io.observe(el);
    });
    const all = (): void => below.forEach((el) => show(el, false));
    addEventListener("beforeprint", all);
    return () => {
      io.disconnect();
      removeEventListener("beforeprint", all);
      all();
    };
  }, []);
}

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
  /** A copy of the row as it looked, kept while it may leave. */
  ghost: HTMLElement | null;
}

/** The live list and its rows (never a leaving copy). */
const UL = ":scope > ul:not([data-ghost])";
const ROWS = `${UL} > li[data-key]`;

/** The key of the whole list's copy, kept while the list empties. */
const LIST = "\u0000list";

/** Where each keyed row is, relative to `host`, as drawn now; the
 * whole list under LIST, for the moment it empties. */
function measure(host: HTMLElement): Map<string, Spot> {
  const out = new Map<string, Spot>();
  const h = host.getBoundingClientRect();
  const ul = host.querySelector<HTMLElement>(UL);
  if (ul !== null) {
    const r = ul.getBoundingClientRect();
    out.set(LIST, { top: r.top - h.top, left: r.left - h.left,
      width: r.width, height: r.height,
      ghost: inView(r) ? ul.cloneNode(true) as HTMLElement : null });
  }
  host.querySelectorAll<HTMLElement>(ROWS)
    .forEach((el) => {
      const r = el.getBoundingClientRect();
      out.set(el.dataset["key"] ?? "", {
        top: r.top - h.top, left: r.left - h.left,
        width: r.width, height: r.height,
        ghost: inView(r) ? el.cloneNode(true) as HTMLElement : null,
      });
    });
  return out;
}

/** A leaving row's copy: drawn only, never read, focused or matched. */
function ghostOf(el: HTMLElement, at: Spot, z: number): HTMLElement {
  el.removeAttribute("data-key");
  el.querySelectorAll("[data-key]").forEach((x) =>
    x.removeAttribute("data-key"));
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("inert", "");
  el.dataset["ghost"] = "";
  el.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
  el.querySelectorAll("[data-row]").forEach((x) => {
    x.removeAttribute("data-row");
    x.removeAttribute("href");
  });
  el.querySelectorAll<HTMLElement>("[style]").forEach((x) =>
    x.style.removeProperty("view-transition-name"));
  Object.assign(el.style, {
    position: "absolute", margin: "0", pointerEvents: "none",
    top: `${at.top / z}px`, left: `${at.left / z}px`,
    width: `${at.width / z}px`, height: `${at.height / z}px`,
    zIndex: "0", boxSizing: "border-box",
  });
  return el;
}

/**
 * FLIP for FilterList. `host` wraps the list and its empty state and
 * outlives both; rows are `ul > li[data-key]`. `keys` are the shown
 * rows in order. Call in render: it measures the rows as drawn before
 * React commits the change, then animates in a layout effect.
 */
export function useListFlip(host: RefObject<HTMLElement | null>,
  keys: string[]): void {
  const sig = keys.join("\u0001");
  const last = useRef<string | null>(null);
  const before = useRef<Map<string, Spot> | null>(null);
  const tall = useRef(0);
  const ghosts = useRef(new Map<string, HTMLElement>());
  // Render phase: the DOM still shows the old rows.
  if (last.current !== null && last.current !== sig &&
    host.current !== null) {
    before.current = measure(host.current);
    tall.current = host.current.getBoundingClientRect().height;
  }
  useLayoutEffect(() => {
    const root = host.current;
    const old = before.current;
    const first = last.current === null;
    last.current = sig;
    before.current = null;
    if (root === null || first || old === null) return;
    const list = root.querySelector(UL);
    const now = new Set(list === null ? keys : [...keys, LIST]);
    // A row that comes back (Undo) loses its leaving copy at once.
    ghosts.current.forEach((g, k) => {
      if (now.has(k)) {
        g.remove();
        ghosts.current.delete(k);
      }
    });
    if (reduced() || !canAnimate()) return;
    const z = zoom();
    const fast = dur("--dur-fast");
    const slow = dur("--dur-slow");
    const base = dur("--dur-base");
    const ease = easeOut();
    const h = root.getBoundingClientRect();
    // A shorter list: what follows it (the page foot) rises with the
    // rows rather than jumping. A longer one pushes it down at once,
    // so it never crosses rows on their way in.
    const lift = (tall.current - h.height) / z;
    if (lift > 0.5) {
      for (let el = root.nextElementSibling; el !== null;
        el = el.nextElementSibling) {
        (el as HTMLElement).animate([{ transform: `translateY(${lift}px)` },
          { transform: "none" }], { duration: slow, easing: ease });
      }
    }
    // The list emptied: it leaves as one while the empty state comes
    // in, half a beat behind (never a blank frame between them).
    const emptied = list === null && old.has(LIST);
    let leaving = 0;
    old.forEach((spot, k) => {
      if (now.has(k) || spot.ghost === null) return;
      if (emptied !== (k === LIST)) return;
      leaving++;
      const g = ghostOf(spot.ghost, spot, z);
      ghosts.current.get(k)?.remove();
      ghosts.current.set(k, g);
      root.appendChild(g);
      const a = veil(g, { duration: fast, easing: ease, out: true });
      const drop = (): void => {
        g.remove();
        if (ghosts.current.get(k) === g) ghosts.current.delete(k);
      };
      a.onfinish = drop;
      a.oncancel = drop;
    });
    if (emptied) {
      const empty = root.firstElementChild;
      if (empty instanceof HTMLElement &&
        empty.dataset["ghost"] === undefined) {
        const delay = leaving > 0 ? fast / 2 : 0;
        empty.animate([{ transform: "translateY(4px)" },
          { transform: "none" }], { duration: base, easing: ease,
          fill: "backwards", delay });
        veil(empty, { duration: base, delay });
      }
      return;
    }
    let fresh = 0;
    root.querySelectorAll<HTMLElement>(ROWS)
      .forEach((el) => {
        const k = el.dataset["key"] ?? "";
        // Retarget from where the row is drawn now: its start was
        // measured with any running slide applied, so cancel that slide
        // before reading where the row now sits.
        el.getAnimations().forEach((x) => {
          if (x.id === "flip") x.cancel();
        });
        const r = el.getBoundingClientRect();
        const was = old.get(k);
        if (was === undefined) {
          if (!inView(r)) return;
          // New rows wait for the leaving ones to clear, then fade in.
          const delay = (leaving > 0 ? fast : 0) +
            Math.min(fresh++, STAGGER_CAP - 1) * (STAGGER_MS / 2);
          el.animate([{ transform: "translateY(6px)" },
            { transform: "none" }],
          { duration: base, easing: ease, fill: "backwards", delay });
          veil(el, { duration: base, delay });
          return;
        }
        const dy = (was.top - (r.top - h.top)) / z;
        if (Math.abs(dy) < 0.5) {
          delete el.dataset["moving"];
          return;
        }
        el.dataset["moving"] = "";
        const a = el.animate([{ transform: `translateY(${dy}px)` },
          { transform: "none" }], { duration: slow, easing: ease });
        a.id = "flip";
        a.onfinish = () => {
          delete el.dataset["moving"];
        };
      });
  }, [sig]);
  useLayoutEffect(() => () => {
    ghosts.current.forEach((g) => g.remove());
  }, []);
}

/**
 * Animates `ref`'s element in when `state` changes after the first
 * render (a row's decision turning into its Undo, an empty state
 * arriving after a filter).
 */
export function useSwapIn(ref: RefObject<HTMLElement | null>,
  state: unknown): void {
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (el === null || reduced() || !canAnimate()) return;
    el.animate([{ transform: "translateY(4px)" }, { transform: "none" }],
      { duration: dur("--dur-base"), easing: easeOut() });
    veil(el, { duration: dur("--dur-base") });
  }, [state]);
}
