import type { ActivityCategory } from "@payroll/contract";

export interface CategoryRule {
  match: string;
  kind: "host-suffix" | "app-id";
  category: ActivityCategory;
}

/**
 * Product default, not law: a short generic list. Runs on the device;
 * the app id or host name never leaves it (only the category does).
 */
export const DEFAULT_CATEGORY_RULES: readonly CategoryRule[] = [
  { match: "mail.example.com", kind: "host-suffix",
    category: "communication" },
  { match: "meet.example.com", kind: "host-suffix", category: "meetings" },
  { match: "docs.example.com", kind: "host-suffix", category: "documents" },
  { match: "sheets.example.com", kind: "host-suffix",
    category: "spreadsheets" },
  { match: "code.editor", kind: "app-id", category: "development" },
  { match: "design.tool", kind: "app-id", category: "design" },
];

/** Unknown input gives "other". */
export function categorise(appOrHost: string,
  rules: readonly CategoryRule[] = DEFAULT_CATEGORY_RULES)
  : ActivityCategory {
  const x = appOrHost.toLowerCase();
  const hit = rules.find((r) => r.kind === "host-suffix"
    ? x === r.match || x.endsWith(`.${r.match}`) : x === r.match);
  return hit?.category ?? "other";
}
