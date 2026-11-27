/**
 * Motion is an enhancement, never a gate. Content that an animation
 * brings in must already be drawn in its end state if the animation
 * never runs or never reaches its end: a paused or throttled timeline
 * (a background tab, Low Power Mode, a slow device), an engine that
 * ignores an option (WAAPI on a pseudo-element), or an observer that
 * never calls back. `settle` jumps whatever is still running to its
 * end once the motion has had more than its time.
 */

/** Head room past an animation's own length before it is settled. */
export const SETTLE_SLACK_MS = 600;

/** Finish (else cancel) every animation still short of its end. */
export function finishAll(anims: readonly Animation[]): void {
  for (const a of anims) {
    if (a.playState === "finished") continue;
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  }
}

/**
 * After `ms` (plus the slack), finish whatever of `anims` has not
 * ended. Returns a cancel for an unmount.
 */
export function settleAfter(anims: readonly Animation[], ms: number)
  : () => void {
  if (anims.length === 0 || typeof setTimeout !== "function") {
    return () => undefined;
  }
  const h = setTimeout(() => finishAll(anims), ms + SETTLE_SLACK_MS);
  return () => clearTimeout(h);
}

/**
 * An IntersectionObserver that is known to work calls back once for
 * each target as soon as it is observed. If none comes within `ms`,
 * `fallback` runs (the observer is missing or broken: show the thing).
 * Returns `seen`, to call from the observer's callback.
 */
export function observerWatchdog(fallback: () => void, ms = 1200)
  : { seen(): void; stop(): void } {
  let called = false;
  const h = setTimeout(() => {
    if (!called) fallback();
  }, ms);
  return { seen: () => { called = true; }, stop: () => clearTimeout(h) };
}

/** The longest a view transition may hold the page (its snapshot
 * covers the page and takes every click until it ends). */
export const TRANSITION_CAP_MS = 1500;

/**
 * A view transition that has not finished by the cap is skipped: the
 * new page shows at once and takes clicks. A stalled timeline would
 * otherwise leave the old snapshot over the page, unclickable.
 */
export function capTransition(vt: { finished: Promise<void>;
  skipTransition?: () => void }, ms = TRANSITION_CAP_MS): void {
  if (typeof vt.skipTransition !== "function") return;
  let done = false;
  vt.finished.then(() => { done = true; }, () => { done = true; });
  setTimeout(() => {
    if (!done) vt.skipTransition?.();
  }, ms);
}
