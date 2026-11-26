import { useEffect, useState } from "react";
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

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = (): void => {
      setRoute(parseHash(location.hash));
      scrollTo({ top: 0 });
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function hrefOf(s: Section, ...rest: string[]): string {
  return `#/${[s, ...rest].map(encodeURIComponent).join("/")}`;
}

export function navigate(s: Section, ...rest: string[]): void {
  location.hash = hrefOf(s, ...rest);
}
