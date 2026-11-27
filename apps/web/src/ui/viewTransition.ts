/**
 * The one door to the View Transitions API, fail-open.
 *
 * While a view transition runs, the browser draws the page as
 * snapshots in a layer over everything and sends every tap to it. If
 * a transition never ends (a browser bug, an update that hangs), the
 * page stays hidden under that layer and nothing can be clicked. The
 * owner's iPhone saw exactly that: the tabs (their own transition
 * group, drawn live) and nothing clickable. So:
 *
 * - WebKit (Safari, and every browser on iOS) does not get view
 *   transitions: the page just changes. `?vt=1` in the address turns
 *   them back on there, to try a fixed Safari.
 * - Elsewhere each transition gets a hard limit (TRANSITION_LIMIT_MS):
 *   past it the transition is skipped and its flags cleared.
 * - A synchronous throw from the browser runs the change plainly.
 * - The update runs exactly once, even if the browser never calls it.
 */

export const TRANSITION_LIMIT_MS = 1500;

export interface Transition {
  finished: Promise<unknown>;
  ready?: Promise<unknown>;
  updateCallbackDone?: Promise<unknown>;
  skipTransition?: () => void;
}
type Doc = Document & {
  startViewTransition?: (cb: () => Promise<void> | void) => Transition;
};

/** Safari and every iOS browser (all of them run WebKit). */
export function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // jsdom (the unit tests) calls itself Apple's too: it is not Safari.
  if (/jsdom/.test(ua)) return false;
  if (navigator.vendor === "Apple Computer, Inc.") return true;
  return /AppleWebKit/.test(ua) && /Safari\//.test(ua) &&
    !/(Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS)\//.test(ua);
}

function forced(): boolean {
  if (typeof location === "undefined") return false;
  return new URLSearchParams(location.search).get("vt") === "1";
}

/** The API is there and allowed here (see the file's note). */
export function hasViewTransitions(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof (document as Doc).startViewTransition !== "function") {
    return false;
  }
  return forced() || !isWebKit();
}

const noop = (): void => undefined;

/**
 * Runs `update` inside a view transition when one may play, else at
 * once; `end` runs once when it is over, however it ends (finished,
 * rejected, skipped, timed out, or no transition at all). Returns
 * whether a transition started.
 */
export function safeTransition(update: () => Promise<void> | void,
  end: () => void = noop, limit = TRANSITION_LIMIT_MS): boolean {
  let ran = false;
  let result: Promise<void> | void;
  const once = (): Promise<void> | void => {
    if (ran) return result;
    ran = true;
    result = update();
    return result;
  };
  let over = false;
  const finish = (): void => {
    if (over) return;
    over = true;
    end();
  };
  if (!hasViewTransitions()) {
    void Promise.resolve(once()).catch(noop).finally(finish);
    return false;
  }
  let vt: Transition;
  try {
    vt = (document as Doc).startViewTransition!(once);
  } catch {
    void Promise.resolve(once()).catch(noop).finally(finish);
    return false;
  }
  if (vt === undefined || vt === null ||
    typeof vt.finished?.then !== "function") {
    void Promise.resolve(once()).catch(noop).finally(finish);
    return false;
  }
  const timer = setTimeout(() => {
    try {
      vt.skipTransition?.();
    } catch {
      // Nothing more to do: the page below is already current.
    }
    // The browser never ran the update: run it here.
    if (!ran) void Promise.resolve(once()).catch(noop);
    finish();
  }, limit);
  vt.ready?.catch(noop);
  vt.updateCallbackDone?.catch(noop);
  vt.finished.then(noop, noop).finally(() => {
    clearTimeout(timer);
    finish();
  });
  return true;
}
