import type { Role } from "../demo/state";
import { areasFor, barFor } from "./registry";
import type { Area } from "./types";

/**
 * The phone's More page: the areas each role reaches for most, in
 * order (phone only; the desktop panels, search and the route guard
 * read the full registry). Everything else stays one tap further, on
 * "More areas". An id a role cannot reach is skipped.
 */
export const PHONE_MORE: Record<Role, readonly string[]> = {
  hr: ["reports.dashboard-hr", "reports.summary", "reports.variance",
    "reports.owner-brief", "reports.all", "reports.audit",
    "setup.company", "setup.users", "setup.leave", "setup.help"],
  gm: ["reports.dashboard-exec", "reports.owner-brief",
    "reports.board-pack", "reports.summary", "reports.variance",
    "reports.dashboard-hr", "reports.all", "reports.audit",
    "reports.sign-offs", "setup.help"],
  it: ["setup.users", "setup.review", "setup.access-requests",
    "setup.signin", "setup.keys", "setup.hooks", "setup.erp",
    "setup.privacy", "setup.company", "setup.help"],
  manager: ["me.payslips", "me.leave", "me.team-reviews", "me.sign",
    "me.policies", "me.expenses", "me.documents", "me.profile",
    "me.help"],
  employee: ["me.payslips", "me.leave", "me.sign", "me.policies",
    "me.expenses", "me.documents", "me.profile", "me.help"],
};

/** At most this many rows before "More areas". */
export const MORE_MAX = 10;

/** Every area the More page stands for: the words the bar leaves out. */
export function moreAreas(role: Role): Area[] {
  const words = new Set(barFor(role).slice(4));
  return areasFor(role).filter((a) => words.has(a.section));
}

/** The More page's rows, and how many areas wait behind "More areas". */
export function phoneMore(role: Role): { top: Area[]; rest: number } {
  const all = moreAreas(role);
  const top = PHONE_MORE[role].map((id) => all.find((a) => a.id === id))
    .filter((a): a is Area => a !== undefined).slice(0, MORE_MAX);
  return { top, rest: all.length - top.length };
}
