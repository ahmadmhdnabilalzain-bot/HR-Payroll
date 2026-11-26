import { useState } from "react";
import { reducedMotion } from "../demo/motion";

/** Surfaces that have already made their entrance on this load. */
const seen = new Set<string>();

/**
 * True the first time a hero surface mounts on this page load, false
 * on every later visit (and with reduced motion): its depth, light and
 * fill play once, then it is simply there. A reload starts again.
 */
export function useFirstReveal(key: string): boolean {
  const [first] = useState(() => {
    const was = seen.has(key);
    seen.add(key);
    return !was && !reducedMotion();
  });
  return first;
}
