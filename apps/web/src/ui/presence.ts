import { useEffect, useState, type RefObject } from "react";
import { reducedMotion } from "../demo/motion";

/**
 * Exits for things that close: a menu, a toast, a modal dialog. Each
 * stays on screen for its exit (CSS transitions, theme/motion.css
 * tokens) and only then leaves the DOM. Being transitions, a reopen
 * mid-exit turns back from where it is.
 *
 * With no exit to play (reduced motion, no transition, or no rendering
 * engine at all, as in unit tests) everything closes at once, as it
 * did before.
 */

/** The longest transition (duration plus delay) on `el`, in ms. */
export function exitMs(el: Element): number {
  if (typeof getComputedStyle !== "function") return 0;
  const cs = getComputedStyle(el);
  const list = (v: string): number[] => v.split(",").map((x) => {
    const n = parseFloat(x);
    return Number.isNaN(n) ? 0 : x.trim().endsWith("ms") ? n : n * 1000;
  });
  const d = list(cs.transitionDuration);
  const w = list(cs.transitionDelay);
  const ms = Math.max(0, ...d.map((x, i) => x + (w[i] ?? 0)));
  return ms < 1 ? 0 : ms;
}

/** Whether exits can play here at all. */
const canExit = (): boolean => typeof matchMedia === "function" &&
  !reducedMotion();

/**
 * Keeps something mounted for `ms` after `open` goes false. `leaving`
 * is true meanwhile: set it as `data-leaving` and make it inert.
 */
export function usePresence(open: boolean, ms: number)
  : { mounted: boolean; leaving: boolean } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    if (!canExit() || ms <= 0) {
      setMounted(false);
      return undefined;
    }
    const h = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(h);
  }, [open, ms]);
  const shown = open || mounted;
  return { mounted: shown, leaving: shown && !open };
}

/**
 * Opens and closes the modal `dialog` at `ref` with `open`, and says
 * whether its content should still render: through the dialog's exit
 * transition (its `display` and `overlay` held with allow-discrete),
 * so it never slides out empty.
 */
export function useModal(ref: RefObject<HTMLDialogElement | null>,
  open: boolean): boolean {
  const [kept, setKept] = useState(open);
  useEffect(() => {
    const d = ref.current;
    if (d === null) return undefined;
    if (open) {
      setKept(true);
      if (!d.open) d.showModal();
      return undefined;
    }
    if (d.open) d.close();
    const ms = canExit() ? exitMs(d) : 0;
    if (ms === 0) {
      setKept(false);
      return undefined;
    }
    // Its own transitionend, so a slowed or busy page never cuts the
    // exit short; the timer is only a backstop.
    const done = (e?: Event): void => {
      if (e !== undefined && e.target !== d) return;
      setKept(false);
    };
    d.addEventListener("transitionend", done);
    const h = setTimeout(done, ms + 400);
    return () => {
      clearTimeout(h);
      d.removeEventListener("transitionend", done);
    };
  }, [open, ref]);
  return open || kept;
}
