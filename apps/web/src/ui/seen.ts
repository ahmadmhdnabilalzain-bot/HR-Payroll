/**
 * "Tell me once each of these is on screen", fail-open: the
 * IntersectionObserver where it reports, and a plain geometry check
 * on every scroll (any scroller), resize and after FAIL_OPEN_MS, for
 * a browser where it never does. Whatever waits hidden for this is
 * shown either way.
 */

/** How long anything waits for an animation or observer, at most. */
export const FAIL_OPEN_MS = 1200;

/** True when `r` reaches into the viewport (with `pad` of its height
 * below it, as the observer's bottom margin). */
function onScreen(r: DOMRect, pad: number): boolean {
  const h = typeof innerHeight === "number" ? innerHeight : 0;
  return r.bottom > 0 && r.top < h * (1 + pad) && r.width + r.height > 0;
}

/**
 * Calls `cb(el)` once for each of `els` when it comes on screen.
 * `pad`: share of the viewport height counted below it (0.06 = the
 * observers' "0px 0px 6% 0px"). Returns the cleanup.
 */
export function onSeen(els: Element[], cb: (el: Element) => void,
  o: { pad?: number; threshold?: number } = {}): () => void {
  const left = new Set(els);
  const pad = o.pad ?? 0;
  let io: IntersectionObserver | null = null;
  const fire = (el: Element): void => {
    if (!left.delete(el)) return;
    io?.unobserve(el);
    cb(el);
    if (left.size === 0) stop();
  };
  const check = (): void => {
    for (const el of [...left]) {
      if (!el.isConnected) {
        left.delete(el);
        continue;
      }
      if (onScreen(el.getBoundingClientRect(), pad)) fire(el);
    }
  };
  let pending: ReturnType<typeof setTimeout> | null = null;
  const soon = (): void => {
    if (pending !== null) return;
    pending = setTimeout(() => {
      pending = null;
      check();
    }, 100);
  };
  const timer = setTimeout(check, FAIL_OPEN_MS);
  const opts = { capture: true, passive: true } as const;
  const stop = (): void => {
    clearTimeout(timer);
    if (pending !== null) clearTimeout(pending);
    io?.disconnect();
    if (typeof document !== "undefined") {
      document.removeEventListener("scroll", soon, opts);
    }
    if (typeof removeEventListener === "function") {
      removeEventListener("resize", soon);
    }
  };
  if (typeof IntersectionObserver === "function") {
    try {
      io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) fire(e.target);
        });
      }, { rootMargin: `0px 0px ${Math.round(pad * 100)}% 0px`,
        threshold: o.threshold ?? 0 });
      left.forEach((el) => io?.observe(el));
    } catch {
      io = null;
    }
  }
  if (typeof document !== "undefined") {
    document.addEventListener("scroll", soon, opts);
  }
  if (typeof addEventListener === "function") {
    addEventListener("resize", soon);
  }
  return stop;
}
