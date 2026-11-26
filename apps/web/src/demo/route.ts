import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { changeRoute } from "../ui/templates/listMotion";
import type { Section } from "./state";

/**
 * Hash routing: `#/section/rest/of/path`. A static host serves
 * index.html for every visit and the offline file works on file://,
 * so no rewrite rule is needed. An empty hash shows Home; an unknown
 * section shows a small "This page does not exist" page.
 */
export const SECTIONS: readonly Section[] = ["home", "pay-run", "people",
  "time-off", "reports", "setup", "s", "me"];

export interface Route {
  section: Section;
  /** Path parts after the section, e.g. `["emp-001"]`. */
  rest: string[];
  /** True when the hash names no section at all (shows "not found"). */
  unknown?: boolean;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean)
    .map(decodeURIComponent);
  const hit = SECTIONS.find((x) => x === parts[0]);
  if (hit !== undefined) return { section: hit, rest: parts.slice(1) };
  return parts.length === 0 ? { section: "home", rest: [] }
    : { section: "home", rest: [], unknown: true };
}

/** Every mounted useRoute, fed by one hashchange listener. */
const subs = new Set<(r: Route) => void>();

/**
 * One listener for the whole app, so one hash change is one route
 * change: each useRoute re-renders inside the same transition. (One
 * listener per hook started a transition per hook; the second skipped
 * the first after it had already unnamed the list's shared parts.)
 */
function onHash(e: HashChangeEvent): void {
  // Between a list and its record, and between sections, the change is
  // animated (ui/templates/listMotion.ts, ui/routeMotion.ts).
  changeRoute(e.oldURL, () => flushSync(() => {
    const r = parseHash(location.hash);
    subs.forEach((set) => set(r));
  }), e.isTrusted);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    if (subs.size === 0) addEventListener("hashchange", onHash);
    subs.add(setRoute);
    return () => {
      subs.delete(setRoute);
      if (subs.size === 0) removeEventListener("hashchange", onHash);
    };
  }, []);
  return route;
}

export function hrefOf(s: Section, ...rest: string[]): string {
  return `#/${[s, ...rest].map(encodeURIComponent).join("/")}`;
}

export function navigate(s: Section, ...rest: string[]): void {
  location.hash = hrefOf(s, ...rest);
}
