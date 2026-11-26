// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { personFor } from "../../demo/time-off";
import type { Area, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;
const STAFF = ["manager", "employee"] as const;
const more = (...rest: string[]) =>
  ({ section: "people" as const, rest: ["more", ...rest] });
const mine = (page: string) =>
  ({ section: "me" as const, rest: [page] });

/** New employee records still to add (HR) or to sign off (GM). */
function hiresWaiting(c: NavCtx): number {
  if (c.state.role === "gm") {
    return c.state.newHires.filter((h) => !h.withdrawn &&
      c.state.decided[h.approvalId] === undefined).length;
  }
  const live = c.state.newHires.filter((h) => !h.withdrawn);
  return c.data.more.starts().filter((x) =>
    !live.some((h) => h.offerId === x.offerId)).length;
}

/** Covers waiting for the viewer's agreement. */
function coversWaiting(c: NavCtx): number {
  const me = personFor(c.data, c.state.role);
  return c.state.covers.filter((x) => !x.withdrawn && x.checkerId === me &&
    c.state.decided[x.approvalId] === undefined).length;
}

/** Expense claims waiting for the viewer's decision. */
function claimsWaiting(c: NavCtx): number {
  const me = personFor(c.data, c.state.role);
  return c.state.claims.filter((x) => !x.withdrawn && x.checkerId === me &&
    x.employeeId !== me && c.state.decided[x.approvalId] === undefined)
    .length;
}

/** Time card corrections waiting for the viewer's decision. */
function fixesWaiting(c: NavCtx): number {
  const me = personFor(c.data, c.state.role);
  return c.state.timeFixes.filter((x) => !x.withdrawn &&
    x.checkerId === me && c.state.decided[x.approvalId] === undefined)
    .length;
}

/**
 * WP18, the sweeper: map rows P04 (new employee) and H10 (approval
 * cover) for HR and the General manager, H10 for a manager under
 * Requests, and the Me pages E08, E09, E11 and E13.
 */
export const AREAS: readonly Area[] = [
  { id: "people.new-employee", section: "people", group: "moves",
    label: { en: "New employee", ar: "موظف جديد" }, status: "live",
    archetype: "FA", roles: HR_GM, route: more("new"), count: hiresWaiting,
    keywords: "P04 new employee add record hire joiner create staff " +
      "accepted offer sign off" },
  { id: "setup.cover", section: "setup", group: "access",
    label: { en: "Approval cover", ar: "بدلاء الموافقة" }, status: "live",
    archetype: "LF", roles: HR_GM, noIt: true, route: more("cover"),
    count: coversWaiting,
    keywords: "H10 leave cover delegate deputy away holiday approver " +
      "stand in who decides" },
  { id: "requests.cover", section: "requests", group: "mine",
    label: { en: "My cover", ar: "بديلي" }, status: "live",
    archetype: "LF", roles: ["manager"], route: mine("cover"),
    keywords: "H10 leave cover delegate deputy away holiday approver " +
      "stand in who decides" },
  { id: "me.expenses", section: "me", group: "mine",
    label: { en: "My expenses", ar: "مصروفاتي" }, status: "live",
    archetype: "FA", roles: STAFF, route: mine("expenses"),
    count: claimsWaiting,
    keywords: "E08 expense claim receipt reimburse taxi meal travel" },
  { id: "time.my-card", section: "time", group: "attendance",
    label: { en: "My time card", ar: "بطاقة دوامي" }, status: "live",
    archetype: "FA", roles: [...STAFF, ...HR_GM], route: mine("timecard"),
    count: fixesWaiting,
    keywords: "E09 my time card clock in out correct attendance late" },
  { id: "me.kpis", section: "me", group: "mine",
    label: { en: "My KPIs", ar: "مؤشراتي" }, status: "live",
    archetype: "LF", roles: STAFF, route: mine("kpis"),
    keywords: "E13 my kpis goals targets objectives progress" },
  { id: "me.team-reviews", section: "me", group: "mine",
    label: { en: "Team reviews", ar: "تقييمات الفريق" }, status: "live",
    archetype: "FA", roles: ["manager"], route: mine("team-reviews"),
    keywords: "E11 team probation appraisal evaluate review rating" },
];
