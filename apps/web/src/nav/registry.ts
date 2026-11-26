import type { Role, Section } from "../demo/state";
import type { MessageKey } from "../i18n/t";
import type { IconName } from "../ui/Icon";
import { VIEWS } from "../views";
import { ALL_AREAS } from "./areas";
import { GROUPS } from "./groups";
import type { Area, AreaRoute, Group, NavCtx, SectionId } from "./types";

/** The bar per role (navigation map, section 1): fixed for a session. */
const BAR: Record<Role, readonly SectionId[]> = {
  hr: ["home", "people", "time", "pay", "reports", "setup"],
  gm: ["home", "people", "time", "pay", "reports", "setup"],
  it: ["home", "people", "reports", "setup"],
  manager: ["home", "pay", "time", "requests", "me"],
  employee: ["home", "pay", "time", "requests", "me"],
};

/**
 * The IT manager runs access and connections: every Setup area HR can
 * reach is theirs too (WP8 and WP9 list only hr and gm). People and
 * Reports areas must name "it" themselves (no company pay).
 */
export function roleAllows(a: Area, role: Role): boolean {
  if (a.roles === undefined || a.roles.includes(role)) return true;
  return role === "it" && a.section === "setup" && a.roles.includes("hr");
}

const keyOf = (r: AreaRoute): string[] => [r.section, ...(r.rest ?? [])];

/**
 * Route sections whose views open whatever path they are handed: a
 * path no area names is judged by the area named here (the section's
 * front page). Other sections (People, Time, Home) check the person
 * themselves, so an unnamed path there is left to the view.
 */
const UNLISTED: Partial<Record<Section, string>> = {
  "pay-run": "pay.run", reports: "reports.all", setup: "setup.company",
  me: "me.profile",
};

/**
 * The shell's one route guard: may this role open this path? The
 * live area whose static route is the longest prefix of the path
 * decides (a record follows its list); when several areas share that
 * route, any of them may let the role in. An area at a section's bare
 * front (`#/people`) does not match deeper paths. Per-viewer routes
 * ("my payslip") are left to the view, which checks the person.
 */
export function mayOpen(role: Role, r: AreaRoute): boolean {
  const path = keyOf(r);
  let best: Area[] = [];
  let len = 0;
  for (const a of ALL_AREAS) {
    if (a.status !== "live" || typeof a.route === "function") continue;
    const k = keyOf(a.route);
    if (k.length < 2 || k.length > path.length || k.length < len) continue;
    if (!k.every((x, i) => path[i] === x)) continue;
    if (k.length > len) best = [];
    len = k.length;
    best.push(a);
  }
  if (best.length > 0) return best.some((a) => roleAllows(a, role));
  const front = UNLISTED[r.section];
  if (front === undefined) return true;
  const a = ALL_AREAS.find((x) => x.id === front);
  return a !== undefined && roleAllows(a, role);
}

export const WORD: Record<SectionId, MessageKey> = {
  home: "shell.navHome", people: "shell.navPeople", time: "shell.navTime",
  pay: "shell.navPay", reports: "shell.navReports", setup: "shell.navSetup",
  requests: "shell.navRequests", me: "shell.navMe",
};

export const WORD_ICON: Record<SectionId, IconName> = {
  home: "home", people: "users", time: "calendar", pay: "wallet",
  reports: "chart", setup: "file", requests: "inbox", me: "user",
};

export function routeOf(a: Area, c: NavCtx): AreaRoute {
  return typeof a.route === "function" ? a.route(c) : a.route;
}

/** Live, allowed for the role, and its route has a view: no dead ends. */
export function isReachable(a: Area, role: Role): boolean {
  if (a.status !== "live") return false;
  if (!roleAllows(a, role)) return false;
  const section = typeof a.route === "function" ? null : a.route.section;
  return section === null || VIEWS[section] !== undefined;
}

export function areasFor(role: Role, section?: SectionId): Area[] {
  return ALL_AREAS.filter((a) => isReachable(a, role) &&
    (section === undefined || a.section === section));
}

export interface PanelGroup {
  group: Group;
  areas: Area[];
}

/** A section's groups in map order, each with its reachable areas. */
export function panelOf(role: Role, section: SectionId): PanelGroup[] {
  const areas = areasFor(role, section);
  return GROUPS.filter((g) => g.section === section)
    .map((group) => ({ group, areas: areas.filter((a) =>
      a.group === group.id) })).filter((x) => x.areas.length > 0);
}

/** The bar words a role sees: Home, then words with a reachable area. */
export function barFor(role: Role): SectionId[] {
  return BAR[role].filter((s) => s === "home" ||
    areasFor(role, s).length > 0);
}

/** The word's own destination: its first area (map section 1). */
export function firstRoute(role: Role, section: SectionId, c: NavCtx)
  : AreaRoute {
  const a = areasFor(role, section)[0];
  return a === undefined ? { section: "home" } : routeOf(a, c);
}

/** Which bar word a route belongs to, for "you are here". */
export function wordOfRoute(role: Role, r: AreaRoute, c: NavCtx)
  : SectionId | null {
  if (r.section === "home") return "home";
  const key = (x: AreaRoute): string =>
    [x.section, ...(x.rest ?? [])].join("/");
  const hit = areasFor(role).find((a) => key(routeOf(a, c)) === key(r)) ??
    areasFor(role).find((a) => routeOf(a, c).section === r.section);
  return hit?.section ?? null;
}

/** A count to show: positive numbers only (map section 2). */
export function countOf(a: Area, c: NavCtx): number | null {
  const n = a.count?.(c) ?? null;
  return n !== null && n > 0 ? n : null;
}
