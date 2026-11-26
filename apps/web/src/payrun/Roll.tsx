import { fils, type Fils } from "@payroll/engine";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "../demo/motion";
import { Money } from "../ui/Money";

/** The pay run's roll: 600 ms, power3.out, in whole fils. */
export const ROLL_S = 0.6;

/** Under reduced motion every change is a short fade instead. */
export function shortFade(el: Element | null): void {
  el?.animate([{ opacity: 0 }, { opacity: 1 }],
    { duration: 120, easing: "ease-out" });
}

/**
 * An amount that rolls to its new value when it changes (GSAP,
 * power3.out over 600 ms; tabular figures hold the width). The first
 * render shows the value as is. Steps are per mille of the gap in
 * bigint, so no float reaches money. Reduced motion: a 120 ms fade.
 */
export function RollMoney(p: { value: Fils; size?: "hero" | "lg" | "md" |
  "sm" }) {
  const [shown, setShown] = useState<Fils>(p.value);
  const from = useRef<bigint>(p.value);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const start = from.current;
    const target = p.value;
    if (start === target) return undefined;
    if (reducedMotion()) {
      from.current = target;
      setShown(target);
      shortFade(box.current);
      return undefined;
    }
    const o = { k: 0 };
    const tw = gsap.to(o, { k: 1000, duration: ROLL_S, ease: "power3.out",
      onUpdate: () => {
        const v = start + ((target - start) * BigInt(Math.round(o.k))) /
          1000n;
        from.current = v;
        setShown(fils(v));
      } });
    return () => {
      tw.kill();
    };
  }, [p.value]);
  return (
    <span ref={box} style={{ display: "inline-flex" }}>
      <Money value={shown} size={p.size ?? "md"} tween={false} />
    </span>
  );
}
