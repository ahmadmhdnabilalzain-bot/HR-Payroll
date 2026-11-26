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
 *
 * A row that leaves (a resolved issue, a decided approval) does not
 * vanish: a copy of it stays where it was and fades and settles out
 * over the same 200 ms, on the same curve, as the rows below slide up
 * into its place, so the gap closes as one move. Only for one or two
 * rows leaving a list that stays; a whole new list just slides.
 */
export function useFlip(ref: RefObject<HTMLElement | null>,
  deps: readonly unknown[]): void {
  const last = useRef(new Map<string, number>());
  const copies = useRef(new Map<string, { node: HTMLElement;
    top: number; left: number; width: number }>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (root === null) return;
    // The list is the copies' frame (and their offsets' end point).
    if (getComputedStyle(root).position === "static") {
      root.style.position = "relative";
    }
    const items = [...root.querySelectorAll<HTMLElement>("[data-flip]")];
    const next = new Map<string, number>();
    const motion = !reducedMotion();
    for (const el of items) {
      const key = el.dataset["flip"] ?? "";
      next.set(key, el.offsetTop);
      const before = last.current.get(key);
      const dy = before === undefined ? 0 : before - el.offsetTop;
      if (dy !== 0 && motion) {
        el.animate([{ transform: `translateY(${dy}px)` },
          { transform: "translateY(0)" }],
        { duration: DUR.base, easing: EASE_OUT });
      }
    }
    const gone = [...copies.current.keys()].filter((k) => !next.has(k));
    if (motion && gone.length > 0 && gone.length <= 2 && next.size > 0) {
      for (const k of gone) {
        const c = copies.current.get(k);
        if (c === undefined) continue;
        const ghost = c.node;
        ghost.setAttribute("aria-hidden", "true");
        ghost.inert = true;
        // Physical offsets: offsetLeft is physical in both directions.
        Object.assign(ghost.style, { position: "absolute", margin: "0",
          top: `${c.top}px`, left: `${c.left}px`, width: `${c.width}px`,
          pointerEvents: "none" });
        root.appendChild(ghost);
        ghost.animate([{ opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(0.98)" }],
        { duration: DUR.base, easing: EASE_OUT, fill: "forwards" })
          .finished.then(() => ghost.remove(), () => ghost.remove());
      }
    }
    // Copies of the rows as they are now, for the next change.
    const keep = new Map<string, { node: HTMLElement; top: number;
      left: number; width: number }>();
    for (const el of items) {
      const key = el.dataset["flip"] ?? "";
      let top = 0;
      let left = 0;
      let n: HTMLElement | null = el;
      while (n !== null && n !== root) {
        top += n.offsetTop;
        left += n.offsetLeft;
        const up: Element | null = n.offsetParent;
        n = up instanceof HTMLElement ? up : null;
      }
      const node = el.cloneNode(true) as HTMLElement;
      node.removeAttribute("data-flip");
      [node, ...node.querySelectorAll("[id]")].forEach((x) =>
        x.removeAttribute("id"));
      keep.set(key, { node, top, left, width: el.offsetWidth });
    }
    copies.current = keep;
    last.current = next;
  }, deps);
}
