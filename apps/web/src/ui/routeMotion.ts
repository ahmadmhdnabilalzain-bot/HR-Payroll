import { reducedMotion } from "../demo/motion";
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
 * --dur-slow. "quick" (pay run steps, role switch) slides 8 px, out
 * over 120 ms and in over 200 ms, overlapped, so no frame is empty.
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
  return !reducedMotion() && typeof doc.startViewTransition === "function"
    && document.querySelector("main")?.closest("[inert]") == null;
}

/**
 * A quick move inside one place (a pay run step, a role switch): the
 * top bar and the step bar hold still, the page fades through, 8 px
 * the way of travel (`dir` 1, -1, or 0 for none). `change` makes the
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
  if (!trusted || !canMove()) return false;
  const dir = directionOf(from, to);
  if (dir === null) return false;
  run(dir, "page", () => {
    render();
    scrollTo({ top: 0, behavior: "instant" });
    return settled();
  });
  return true;
}
