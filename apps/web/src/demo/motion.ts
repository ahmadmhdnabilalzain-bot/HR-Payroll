import { gsap } from "gsap";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Durations in ms; theme/motion.css carries the same values. */
export const DUR = { fast: 120, base: 200, slow: 320, hero: 480 } as const;
export const EASE_OUT = "cubic-bezier(0.2, 0, 0, 1)";

/** Read on each use: the person can change it while the page is open. */
export function reducedMotion(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Totals roll over this long (GSAP power3.out), per the motion spec. */
export const ROLL_MS = 600;

/**
 * A bigint that rolls to its target when the target changes (GSAP,
 * power3.out). The first render shows the target as is unless `start`
 * asks for the opening count-up. The steps are integer (per mille of
 * the gap), so no float reaches money; tabular figures hold the width.
 */
export function useTweenedBigint(target: bigint, ms: number = ROLL_MS,
  start?: bigint): bigint {
  const first = start !== undefined && !reducedMotion() ? start : target;
  const [shown, setShown] = useState(first);
  const from = useRef(first);
  useLayoutEffect(() => {
    const start = from.current;
    if (start === target) return undefined;
    if (reducedMotion()) {
      from.current = target;
      setShown(target);
      return undefined;
    }
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, { p: 1, duration: ms / 1000,
      ease: "power3.out", onUpdate: () => {
        const k = BigInt(Math.round(proxy.p * 1000));
        const v = start + ((target - start) * k) / 1000n;
        from.current = v;
        setShown(v);
      } });
    return () => {
      tween.kill();
    };
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
  }, deps);
}
