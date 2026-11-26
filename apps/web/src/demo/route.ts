import { useEffect, useState } from "react";
import type { Section } from "./state";

/**
 * Hash routing (`#/home`): a static host serves index.html for every
 * visit, so no rewrite rule is needed. Unknown hashes show Home.
 */
const SECTIONS: readonly Section[] = ["home", "pay-run", "people",
  "time-off", "reports"];

/** Sections built in this demo build; the others are inert in nav. */
export const BUILT: ReadonlySet<Section> = new Set<Section>(["home"]);

function read(): Section {
  const raw = location.hash.replace(/^#\/?/, "");
  const hit = SECTIONS.find((x) => x === raw);
  return hit !== undefined && BUILT.has(hit) ? hit : "home";
}

export function useSection(): Section {
  const [section, setSection] = useState<Section>(read);
  useEffect(() => {
    const on = (): void => setSection(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return section;
}

export function hrefOf(s: Section): string {
  return `#/${s}`;
}
