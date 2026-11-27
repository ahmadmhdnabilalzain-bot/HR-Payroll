import { reducedMotion } from "../demo/motion";
import { capTransition, settleAfter } from "./settle";
import { SECTIONS } from "../demo/route";

/**
 * Route motion between sections: the page slides 24 to 32 px the
 * reading way and cross-fades (old out over --dur-base, new in over
 * --dur-slow; theme/shell-motion.css), while the top bar, the group
 * tabs and the phone tabs stay put and stay live, so the tab
 * indicator glides inside them (ui/glide.ts).
 *
 * - Which changes: a new section, or a sibling area in the group tabs.
 *   A record's own tabs, a record under its list (ui/templates/
 *   listMotion.ts owns that), the opening and anything a script sends
 *   (the role switch's own crossfade) just render.
 * - Direction: forward when the target sits later in the group tabs,
 *   or later in the bar's section order; back the other way. Mirrored
 *   in Arabic (RTL). Unknown: a plain cross-fade.
 * - No View Transitions API, or reduced motion: it just renders.
 * - Interruptible: a new navigation skips the running one to its end
 *   (the browser's rule) and starts from the page as it now is.
 */

interface Transition {
  finished: Promise<void>;
  ready?: Promise<void>;
  skipTransition?: () => void;
}
type Doc = Document & {
  startViewTransition?: (cb: () => Promise<void> | void) => Transition;
};

/**
 * Snapshot motion (the View Transitions API) is off for route changes.
 * While a view transition runs, its callback pending or its layers
 * animating, Chromium sends every click to the root element whatever
 * the layers' pointer-events say, so a click in the first 0.25 to
 * 1.5 s after a change was swallowed (dead-click audit, 27 Nov). The
 * page now changes at once and its live content fades in (`fadeIn`),
 * pressable from the first frame. Turn this on only with a way to
 * keep clicks live.
 */
export const SNAPSHOT_MOTION = false;

/** How long the new page's content takes to fade in. */
const FADE_IN_MS = 160;

/**
 * The new page fades in where it stands: opacity only, on the live
 * `main` (nothing is copied, covered or made inert, so a click lands
 * at once). Reduced motion: none. A stalled timeline is finished on a
 * timer (ui/settle.ts).
 */
export function fadeIn(): void {
  if (reducedMotion()) return;
  const main = document.querySelector("main");
  if (main === null || typeof main.animate !== "function") return;
  const a = main.animate([{ opacity: 0.4 }, { opacity: 1 }],
    { duration: FADE_IN_MS, easing: "ease-out" });
  settleAfter([a], FADE_IN_MS);
}

/** The transition in flight, so only its own end clears the flags. */
let running: Transition | null = null;

const sectionOf = (hash: string): string =>
  hash.replace(/^#\/?/, "").split("/")[0] ?? "";

/** The index of `hash` among the group tabs on screen, or -1. */
function tabIndex(hash: string): number {
  const links = [...document.querySelectorAll<HTMLAnchorElement>(
    "[data-vt='tabs'] a[href]")];
  return links.findIndex((a) => a.getAttribute("href") === hash);
}

function currentTab(): number {
  const links = [...document.querySelectorAll<HTMLAnchorElement>(
    "[data-vt='tabs'] a[href]")];
  return links.findIndex((a) => a.getAttribute("aria-current") === "page");
}

/** +1 forward, -1 back, 0 for no slide; null: do not animate. */
export function directionOf(from: string, to: string): number | null {
  const a = sectionOf(from);
  const b = sectionOf(to);
  const sibling = tabIndex(to);
  if (sibling >= 0) {
    const here = currentTab();
    if (here === sibling) return null;
    return here < 0 ? 0 : sibling > here ? 1 : -1;
  }
  if (a === b || a === "welcome" || b === "welcome") return null;
  const order = (s: string): number => {
    const i = (SECTIONS as readonly string[]).indexOf(s === "" ? "home" : s);
    return i;
  };
  const i = order(a);
  const j = order(b);
  return i < 0 || j < 0 || i === j ? 0 : j > i ? 1 : -1;
}

/** Waits (a few frames at most) for the new page's heading. */
function settled(): Promise<void> {
  return until(() => document.querySelector("main h1") !== null, 240);
}

/**
 * Pace: "page" slides 24 to 32 px, out over --dur-base, in over
 * --dur-slow. "quick" (the role switch) fades out over 120 ms, then
 * in over 200 ms: no frame holds both pages, and the faint stretch
 * between them is a frame or two.
 */
type Pace = "page" | "quick";

/** Runs `change` inside the route transition, in direction `dir`. */
function run(dir: number, pace: Pace,
  change: () => Promise<void> | void): void {
  const doc = document as Doc;
  const html = document.documentElement;
  const rtl = getComputedStyle(html).direction === "rtl";
  html.style.setProperty("--route-dir", String(rtl ? -dir : dir));
  html.dataset["routeMotion"] = dir > 0 ? "forward" : dir < 0 ? "back"
    : "fade";
  html.dataset["routePace"] = pace;
  const vt = doc.startViewTransition!(change);
  capTransition(vt);
  running = vt;
  vt.ready?.catch(() => undefined);
  vt.finished.finally(() => {
    if (running !== vt) return;
    running = null;
    delete html.dataset["routeMotion"];
    delete html.dataset["routePace"];
    html.style.removeProperty("--route-dir");
  }).catch(() => undefined);
}

/** Whether a route transition can play now. */
export function canMove(): boolean {
  const doc = document as Doc;
  return SNAPSHOT_MOTION && !reducedMotion()
    && typeof doc.startViewTransition === "function"
    && document.querySelector("main")?.closest("[inert]") == null;
}

/**
 * A quick move inside one place (the role switch): the top bar holds
 * still and the page fades through, 8 px the way of travel (`dir` 1,
 * -1, or 0 for none, in place). `change` makes the
 * change; `ready` resolves once the new page is on screen (the old
 * one stays until then, so no blank frame shows). Without the View
 * Transitions API, or with reduced motion, it just changes.
 */
export function moveWithin(dir: number, change: () => void,
  ready: () => boolean = () => true): void {
  if (!canMove()) {
    change();
    return;
  }
  run(dir, "quick", () => {
    change();
    return until(ready);
  });
}

/**
 * Resolves once `ready()` holds, or after `ms` at most. Polled on a
 * timer, not on animation frames: while a view transition waits for
 * its update, the browser runs no frames, so a frame loop would stall
 * until the browser gives up on the transition (about 4 s).
 */
function until(ready: () => boolean, ms = 400): Promise<void> {
  const end = performance.now() + ms;
  return new Promise((done) => {
    const tick = (): void => {
      if (ready() || performance.now() > end) done();
      else setTimeout(tick, 16);
    };
    tick();
  });
}

/**
 * Renders the change from `from` to `to` with the section slide when
 * it is one; returns false (and renders nothing) when it is not, so
 * the caller renders as before.
 */
export function slideRoute(from: string, to: string, render: () => void,
  trusted: boolean): boolean {
  // Script-sent changes and the opening (an inert product) just render.
  if (!trusted) return false;
  const dir = directionOf(from, to);
  if (dir === null) return false;
  if (!canMove()) {
    // No snapshot: the page changes at once and fades in, live.
    render();
    scrollTo({ top: 0, behavior: "instant" });
    fadeIn();
    return true;
  }
  run(dir, "page", () => {
    render();
    scrollTo({ top: 0, behavior: "instant" });
    return settled();
  });
  return true;
}
