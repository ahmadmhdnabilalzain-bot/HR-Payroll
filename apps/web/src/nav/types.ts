import type { DemoData, Localized } from "../demo/data/types";
import type { DemoState, Role, Section } from "../demo/state";

/**
 * The navigation registry's vocabulary (docs/design/2026-11-26-
 * navigation-map.md, sections 1 to 4). A bar word is a SectionId; each
 * opens a panel of groups; each group lists areas. Every area names
 * its route, its screen template and, when it has one, a live count.
 */
export type SectionId = "home" | "people" | "time" | "pay" | "reports" |
  "setup" | "requests" | "me";

/** The screen templates (map section 4); "custom" is a bespoke view. */
export type Archetype = "LF" | "RT" | "FA" | "CA" | "RP" | "ST" | "SF" |
  "custom";

/** "live": built and reachable. Panels and search list live areas only. */
export type AreaStatus = "live" | "planned";

/** A hash route: `#/<section>/<rest...>` (demo/route.ts). */
export interface AreaRoute {
  section: Section;
  rest?: string[];
}

/** What a count or a role-dependent route may read. */
export interface NavCtx {
  data: DemoData;
  state: DemoState;
}

export interface Area {
  /** Unique across the registry, e.g. "people.everyone". */
  id: string;
  label: Localized;
  section: SectionId;
  /** A group id from nav/groups.ts for this section. */
  group: string;
  status: AreaStatus;
  archetype: Archetype;
  /** Static, or worked out per role and state (e.g. "my payslip"). */
  route: AreaRoute | ((c: NavCtx) => AreaRoute);
  /**
   * Things waiting for someone here (map section 2: not a total, except
   * "Everyone"). 0 or null shows no count.
   */
  count?: (c: NavCtx) => number | null;
  /** True when the count stops pay (shown red; at most one per panel). */
  stopsPay?: boolean;
  /** Roles that see the area; all roles when left out. */
  roles?: readonly Role[];
  /** Extra words search should match (both languages welcome). */
  keywords?: string;
}

export interface Group {
  id: string;
  section: SectionId;
  label: Localized;
}
