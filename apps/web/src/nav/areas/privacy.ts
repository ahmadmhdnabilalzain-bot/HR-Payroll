import type { Area } from "../types";

const HR_GM = ["hr", "gm"] as const;

/**
 * WP23: privacy and retention (S26). HR and the General manager
 * decide; the IT manager reads (every Setup area HR reaches is
 * open to IT). Nothing here says the company meets any law.
 */
const area = (id: string, en: string, archetype: Area["archetype"],
  page: string, keywords: string): Area => ({ id, section: "setup",
  group: "data", label: { en, ar: en }, status: "live", archetype,
  roles: HR_GM, route: { section: "setup", rest: ["privacy", page] },
  keywords });

export const AREAS: readonly Area[] = [
  area("setup.privacy", "Privacy and retention", "ST", "settings",
    "S26 privacy pdpl personal data retention period keep settings"),
  area("setup.privacy-register", "Personal data kept", "LF", "register",
    "S26 privacy register data categories who can see why kept"),
  area("setup.privacy-requests", "Data requests", "LF", "requests",
    "S26 data subject request access correction erasure due date"),
  area("setup.privacy-run", "Retention run", "LF", "run",
    "S26 retention run leavers remove sign off"),
];
