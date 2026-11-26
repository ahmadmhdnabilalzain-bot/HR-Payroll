import { gsap } from "gsap";
import { useLayoutEffect, useRef, type RefObject } from "react";

/** Durations in ms; the CSS tokens carry the same values. */
export const DUR = { fast: 150, base: 200, slow: 250 } as const;
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Read on each use: the person can change it while the page is open. */
export function reducedMotion(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Figures land at once. A money figure or a count never counts up
 * through in-between values (a figure on the way never reads as the
 * total), and a header count is the store's value in the same frame.
 * Money figures crossfade in ui/Money instead. Kept as hooks.
 */
export function useTweenedBigint(target: bigint): bigint {
  return target;
}

/** A whole number, as is (counts, headcounts). */
export function useTweenedNumber(target: number): number {
  return target;
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
  }, deps);
}
