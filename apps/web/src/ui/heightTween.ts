import { useLayoutEffect, useRef, type RefObject } from "react";
import { reducedMotion } from "../demo/motion";

/** A card's height change, eased rather than jumped. */
export const HEIGHT_MS = 250;

/**
 * When `key` changes, the element's height eases from what it was to
 * what it is now (250 ms, --ease-out), so a card that loses or gains a
 * line never jumps. Measured every render, animated only on a change
 * of `key`. Web Animations (a capture can seek it); reduced motion:
 * the new height at once.
 */
export function useHeightTween(ref: RefObject<HTMLElement | null>,
  key: unknown): void {
  const last = useRef<{ key: unknown; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const h = el.getBoundingClientRect().height;
    const was = last.current;
    last.current = { key, h };
    if (was === null || was.key === key || reducedMotion() ||
      Math.abs(was.h - h) < 1) return;
    const z = Number(getComputedStyle(document.documentElement)
      .getPropertyValue("zoom")) || 1;
    el.animate([{ height: `${was.h / z}px`, overflow: "hidden" },
      { height: `${h / z}px`, overflow: "hidden" }],
    { duration: HEIGHT_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" });
  });
}
