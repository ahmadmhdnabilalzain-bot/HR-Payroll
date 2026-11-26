import type { Role } from "../demo/state";
import { areasFor, routeOf } from "../nav/registry";
import type { Area, NavCtx } from "../nav/types";

const keyOf = (section: string, rest: string[] = []): string =>
  [section, ...rest].join("/");

/** Routes whose last segment sets the same page (Variance's month),
 * not a record under it: they keep that page's tabs, so stepping the
 * month never swaps the tabs for a breadcrumb (a jump of the head). */
const SAME_PAGE = [/^(reports\/variance)\/[^/]+$/];

const pageOf = (key: string): string => {
  for (const re of SAME_PAGE) {
    const m = re.exec(key);
    if (m !== null) return m[1] ?? key;
  }
  return key;
};

/** The group last opened from a panel ("section/group"), if any. */
let picked: string | null = null;

/** The panel calls this when a group row is opened. */
export function pickGroup(section: string, group: string): void {
  picked = `${section}/${group}`;
}

/**
 * The tabs for the page at `section/rest`: the areas of the group the
 * page belongs to, when there is more than one. Two areas can share a
 * route (Time's "Leave requests" and a manager's "Waiting for you");
 * the group opened from the panel wins, so its tabs are the ones
 * shown. A record under an area (a longer route) gets no tabs.
 */
export function tabsAt(role: Role, c: NavCtx, section: string,
  rest: string[], prefer: string | null = picked)
  : { at: Area; tabs: Area[] } | null {
  const all = areasFor(role);
  const here = pageOf(keyOf(section, rest));
  const hits = all.filter((a) => {
    const r = routeOf(a, c);
    return keyOf(r.section, r.rest) === here;
  });
  const at = hits.find((a) => `${a.section}/${a.group}` === prefer) ??
    hits[0];
  if (at === undefined) return null;
  const tabs = all.filter((a) => a.section === at.section &&
    a.group === at.group);
  return tabs.length < 2 ? null : { at, tabs };
}
