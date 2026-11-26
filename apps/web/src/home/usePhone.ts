import { useSyncExternalStore } from "react";

/** The width at which Home becomes its phone layout (tokens.css). */
const PHONE = "(max-width: 760px)";

const subscribe = (on: () => void): (() => void) => {
  if (typeof matchMedia !== "function") return () => undefined;
  const mq = matchMedia(PHONE);
  mq.addEventListener("change", on);
  return () => mq.removeEventListener("change", on);
};

const phoneNow = (): boolean =>
  typeof matchMedia === "function" && matchMedia(PHONE).matches;

/**
 * True on a phone-width screen. Home renders its few phone-only parts
 * (the short "Waiting for you" list, the chart after the strip) from
 * this, so each exists once in the page and never twice, hidden.
 */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribe, phoneNow, () => false);
}
