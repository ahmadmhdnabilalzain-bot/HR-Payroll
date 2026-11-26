import { useEffect, useState } from "react";
import { reducedMotion } from "../demo/motion";
import type { Role } from "../demo/state";

/**
 * The opening lives at #/welcome, outside the product's sections: not
 * in the bar, the panels or the registry. It plays by itself once, at
 * the first load of the demo for HR and the GM, and again from
 * "Replay opening" in the search palette. This file is in the entry
 * chunk: it decides before anything of the opening loads.
 */
export const WELCOME_HASH = "#/welcome";

export const isWelcome = (hash: string): boolean =>
  /^#\/?welcome(\/|$)/.test(hash);

export function useWelcome(): boolean {
  const [on, setOn] = useState(() => isWelcome(location.hash));
  useEffect(() => {
    const read = (): void => setOn(isWelcome(location.hash));
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  return on;
}

/** Laptops and desktops only: a mouse or trackpad and a wide window.
 * Phones, tablets held by hand and iPhones never get the 3D. */
export function laptop(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(pointer: fine) and (hover: hover) and (min-width: 1024px)")
      .matches;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/** The 3D film can play here: a laptop, motion allowed, WebGL, and no
 * `?static=1` in the address. Otherwise #/welcome shows a still. */
export function mayPlay(): boolean {
  const forced = new URLSearchParams(location.search).get("static") === "1";
  return !forced && laptop() && !reducedMotion() && hasWebGL();
}

/* Whether the opening has played in this browser. Kept beside the
 * language and theme prefs; blocked storage counts as seen, so the
 * film never plays on every load. */
const SEEN_KEY = "opening";

export function seenOpening(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "seen";
  } catch {
    return true;
  }
}

export function markOpeningSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "seen");
  } catch {
    // Blocked storage: seenOpening() already says seen.
  }
}

/** The first load plays the opening: HR or the GM, landing on Home
 * (a deep link wants its page), never seen before, and able to play. */
export function opensAtFirstLoad(role: Role, hash: string): boolean {
  const home = /^(#\/?(home\/?)?)?$/.test(hash);
  return (role === "hr" || role === "gm") && home && !seenOpening() &&
    mayPlay();
}
