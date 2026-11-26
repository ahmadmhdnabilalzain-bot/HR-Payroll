import { gsap } from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { reducedMotion } from "../demo/motion";

/** The roll the critique asks for: 600 ms, power3.out. */
const ROLL = { duration: 0.6, ease: "power3.out" } as const;

/**
 * A whole number (half-days, counts) that rolls to a new value with
 * GSAP when it changes. GSAP only drives a 0..1 progress; the value
 * steps in whole per mille of the gap, so the shown number is always
 * an integer, set in tabular figures by the caller. No roll on first
 * render, none under reduced motion.
 */
export function useRoll(target: number): number {
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
    const p = { v: 0 };
    const tween = gsap.to(p, { ...ROLL, v: 1, onUpdate: () => {
      const k = Math.round(p.v * 1000);
      const v = start + Math.round(((target - start) * k) / 1000);
      from.current = v;
      setShown(v);
    }, onComplete: () => {
      from.current = target;
      setShown(target);
    } });
    return () => {
      tween.kill();
    };
  }, [target]);
  return shown;
}
