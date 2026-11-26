import { reducedMotion } from "../demo/motion";

/**
 * One flight helper for the whole demo: a figure (or a chip) leaves
 * one place and lands on another, as a clone in its own fixed layer,
 * so neither the source nor the target moves or re-renders on the
 * way. Used by the pay run's Fix step and by Home for the held amount
 * travelling into the salary file total.
 *
 * - Travel: 420 ms on a spring (stiffness 300, damping 30, mass 1;
 *   about 0.87 of critical damping, so a hair of settle, no bounce).
 * - Then the clone fades over 160 ms while the target takes the new
 *   value (call `onLand` to start the target's own roll there), with
 *   a hair of give as it receives it (1.03 to 1 over 280 ms).
 * - Reduced motion: no travel. The target fades in over 120 ms and
 *   `onLand` runs at once.
 */

/** The flight's travel time. */
export const FLIGHT_MS = 420;
/** The clone's fade once it has landed. */
export const LAND_FADE_MS = 160;

/** The target's give as it receives the chip. */
export const RECEIVE_MS = 280;

/** A spring (k 300, c 30, m 1) sampled into a CSS linear() easing. */
function springEasing(k = 300, c = 30, ms = FLIGHT_MS, n = 24): string {
  const w = Math.sqrt(k);
  const z = c / (2 * w);
  const wd = w * Math.sqrt(1 - z * z);
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (ms / 1000);
    const x = i === n ? 1 : 1 - Math.exp(-z * w * t) *
      (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
    pts.push(x.toFixed(4));
  }
  return `linear(${pts.join(", ")})`;
}

export const SPRING = springEasing();

type Place = Element | DOMRect;

const rectOf = (p: Place): DOMRect =>
  p instanceof Element ? p.getBoundingClientRect() : p;

/** The page zoom (the 1.2 projector zoom on wide screens). */
function zoom(): number {
  return Number(getComputedStyle(document.documentElement)
    .getPropertyValue("zoom")) || 1;
}

export interface FlyOptions {
  /** Where it leaves from: an element or a rect taken before it went. */
  from: Place;
  /** Where it lands: an element (read now) or a rect. */
  to: Place;
  /** What travels: a node to clone (the source figure or a chip). */
  content: Node;
  /** Called when it lands (start the target's roll here). */
  onLand?: () => void;
  /** Line the clone up on the target's end edge (figures) rather than
   * its centre. Default: centre. */
  align?: "center" | "end";
  /** Extra class names for the clone (type size, colour). */
  className?: string;
}

/**
 * Flies `content` from `from` to `to`. Returns a cancel function: it
 * removes the clone and still calls `onLand` once, so the target never
 * stays on the old value.
 */
export function fly(o: FlyOptions): () => void {
  let landed = false;
  const land = (): void => {
    if (landed) return;
    landed = true;
    o.onLand?.();
  };
  const target = o.to instanceof Element ? o.to : null;
  if (reducedMotion()) {
    land();
    target?.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: 120, easing: "linear" });
    return () => undefined;
  }
  const z = zoom();
  const a = rectOf(o.from);
  const b = rectOf(o.to);
  const clone = document.createElement("div");
  clone.setAttribute("aria-hidden", "true");
  clone.dataset["flight"] = "";
  if (o.className !== undefined) clone.className = o.className;
  clone.appendChild(o.content.cloneNode(true));
  Object.assign(clone.style, {
    position: "fixed", left: "0px", top: "0px", margin: "0",
    zIndex: "60", pointerEvents: "none", whiteSpace: "nowrap",
    willChange: "transform, opacity",
  });
  document.body.appendChild(clone);
  const c = clone.getBoundingClientRect();
  // Start: the clone's centre on the source's centre.
  const x0 = (a.left + a.width / 2 - c.width / 2) / z;
  const y0 = (a.top + a.height / 2 - c.height / 2) / z;
  // End: on the target's centre, or flush with its end edge.
  const x1 = (o.align === "end" ? b.right - c.width
    : b.left + b.width / 2 - c.width / 2) / z;
  const y1 = (b.top + b.height / 2 - c.height / 2) / z;
  const travel = clone.animate([
    { transform: `translate(${x0}px, ${y0}px)` },
    { transform: `translate(${x1}px, ${y1}px)` },
  ], { duration: FLIGHT_MS, easing: SPRING, fill: "forwards" });
  // The fade is scheduled at launch, on the compositor: if onLand's
  // work blocks the main thread, the clone still fades on time rather
  // than parking on the target.
  const total = FLIGHT_MS + LAND_FADE_MS;
  const fade = clone.animate([
    { opacity: 1 },
    { opacity: 1, offset: FLIGHT_MS / total },
    { opacity: 0 },
  ], { duration: total, easing: "linear", fill: "forwards" });
  const done = (): void => {
    clone.remove();
  };
  fade.onfinish = done;
  travel.onfinish = () => {
    // The target takes the chip: a hair of give, then home. Scheduled
    // from the travel's end, on the same clock as the flight.
    target?.animate([{ transform: "scale(1.03)" },
      { transform: "scale(1)" }], { duration: RECEIVE_MS,
      easing: "cubic-bezier(0.2, 0, 0, 1)" });
    land();
  };
  return () => {
    travel.cancel();
    fade.cancel();
    done();
    land();
  };
}
