import type { Fils } from "@payroll/engine";
import { Money } from "../ui/Money";
import { safeAnimate } from "../ui/safeAnimate";

/** Under reduced motion every change is a short fade instead. */
export function shortFade(el: Element | null): void {
  safeAnimate(el, [{ opacity: 0 }, { opacity: 1 }],
    { duration: 120, easing: "ease-out" });
}

/** An amount whose change crossfades (Money does it). */
export function RollMoney(p: { value: Fils; size?: "hero" | "lg" | "md" |
  "sm" }) {
  return <Money value={p.value} size={p.size ?? "md"} />;
}
