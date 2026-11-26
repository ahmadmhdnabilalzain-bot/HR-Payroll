import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Durations in ms; the CSS tokens carry the same values. */
export const DUR = { fast: 150, base: 200, slow: 250 } as const;
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Read on each use: the person can change it while the page is open. */
export function reducedMotion(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const easeOutCubic = (p: number): number => 1 - (1 - p) ** 3;

/**
 * A bigint that eases to its target over `ms` when the target changes.
 * The first render shows the target as is: no count-up on load. The
 * steps are integer (per mille of the gap), so no float reaches money.
 */
export function useTweenedBigint(target: bigint, ms: number = DUR.slow)
  : bigint {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useLayoutEffect(() => {
    const start = from.current;
    if (start === target) return undefined;
    if (reducedMotion()) {
      from.current = target;
      setShown(target);
      return undefined;
    }
    let raf = 0;
    let t0 = -1;
    const tick = (now: number): void => {
      if (t0 < 0) t0 = now;
      const p = Math.min(1, (now - t0) / ms);
      const k = BigInt(Math.round(easeOutCubic(p) * 1000));
      const v = start + ((target - start) * k) / 1000n;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

/** A whole number that eases to its target (counts, headcounts). */
export function useTweenedNumber(target: number, ms: number = DUR.slow)
  : number {
  return Number(useTweenedBigint(BigInt(target), ms));
}

/**
 * FLIP for a list: children marked `data-flip` slide from where they
 * were to where they are now whenever `deps` change. Positions are
 * read relative to the container, so page scroll does not matter.
 */
export function useFlip(ref: RefObject<HTMLElement | null>,
  deps: readonly unknown[]): void {
  const last = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (root === null) return;
    const items = [...root.querySelectorAll<HTMLElement>("[data-flip]")];
    const next = new Map<string, number>();
    for (const el of items) {
      const key = el.dataset["flip"] ?? "";
      next.set(key, el.offsetTop);
      const before = last.current.get(key);
      const dy = before === undefined ? 0 : before - el.offsetTop;
      if (dy !== 0 && !reducedMotion()) {
        el.animate([{ transform: `translateY(${dy}px)` },
          { transform: "translateY(0)" }],
        { duration: DUR.slow, easing: EASE_OUT });
      }
    }
    last.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
