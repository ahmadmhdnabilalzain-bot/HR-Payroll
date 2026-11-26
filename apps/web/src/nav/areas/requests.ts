// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import {
  accessIsOpen,
  accessRows,
  changeIsOpen,
  changeRows,
  ticketNeedsHr,
  ticketRows,
  travelIsOpen,
  travelRows,
} from "../../people/requests/model";
import { personFor } from "../../demo/time-off";
import type { Area, AreaRoute, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;
const STAFF = ["manager", "employee"] as const;
const req = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest: ["requests", ...rest] });
const me = (...rest: string[]): AreaRoute => ({ section: "me", rest });

const changes = (c: NavCtx): number =>
  changeRows(c.data, c.state).filter(changeIsOpen).length;
const travel = (c: NavCtx): number =>
  travelRows(c.data, c.state).filter(travelIsOpen).length;
const tickets = (c: NavCtx): number =>
  ticketRows(c.data, c.state).filter(ticketNeedsHr).length;
const access = (c: NavCtx): number =>
  accessRows(c.data, c.state).filter(accessIsOpen).length;
/** Tickets where HR has answered and the viewer is next. */
const answered = (c: NavCtx): number => {
  const who = personFor(c.data, c.state.role);
  return ticketRows(c.data, c.state).filter((t) =>
    t.employeeId === who && t.status === "waiting").length;
};

/**
 * WP14: profile changes, travel and tickets, the HR help desk, access
 * requests, approval splits and resets, my calendar and help (map rows
 * P32, P36, P37, E06, E07, E12, E15, H11, H12).
 */
export const AREAS: readonly Area[] = [
  { id: "people.profile-changes", section: "people", group: "requests",
    label: { en: "Profile changes", ar: "تغييرات الملف" }, status: "live",
    archetype: "FA", roles: HR_GM, route: req("changes"), count: changes,
    keywords: "P32 profile change request address mobile name marital " +
      "dependant self-service" },
  { id: "people.travel", section: "people", group: "requests",
    label: { en: "Travel and tickets", ar: "السفر والتذاكر" },
    status: "live", archetype: "LF", roles: HR_GM, route: req("travel"),
    count: travel, keywords: "P36 air ticket flight trip home leave " +
      "entitlement" },
  { id: "people.helpdesk", section: "people", group: "requests",
    label: { en: "HR help desk", ar: "مكتب مساعدة الموارد البشرية" },
    status: "live", archetype: "LF", roles: HR_GM, route: req("helpdesk"),
    count: tickets, keywords: "P37 ticket question reply support" },
  { id: "setup.access-requests", section: "setup", group: "access",
    label: { en: "Access requests", ar: "طلبات الصلاحيات" },
    status: "live", archetype: "LF", roles: HR_GM, route: req("access"),
    count: access, keywords: "E15 role request give access queue" },
  { id: "setup.splits", section: "setup", group: "access",
    label: { en: "Change sign-off", ar: "تغيير التوقيع" },
    status: "live", archetype: "FA", roles: HR_GM, route: req("splits"),
    keywords: "H11 approval split reset second checker send back" },
  { id: "setup.help", section: "setup", group: "data",
    label: { en: "Help", ar: "المساعدة" }, status: "live",
    archetype: "RP", roles: HR_GM, route: me("help"),
    keywords: "H12 help how to guide" },
  { id: "me.change-details", section: "me", group: "mine",
    label: { en: "Change my details", ar: "تغيير بياناتي" }, status: "live",
    archetype: "FA", roles: STAFF, route: me("change-details"),
    keywords: "E06 profile change address mobile dependant" },
  { id: "me.calendar", section: "me", group: "mine",
    label: { en: "My calendar", ar: "تقويمي" }, status: "live",
    archetype: "CA", roles: STAFF, route: me("calendar"),
    keywords: "E12 calendar leave holiday payday training" },
  { id: "me.help", section: "me", group: "mine",
    label: { en: "Help", ar: "المساعدة" }, status: "live",
    archetype: "RP", roles: STAFF, route: me("help"),
    keywords: "H12 help how to guide" },
  { id: "requests.asks", section: "requests", group: "mine",
    label: { en: "Requests and letters", ar: "الطلبات والخطابات" },
    status: "live", archetype: "FA", roles: STAFF,
    route: me("hr-requests"), count: answered,
    keywords: "E07 letter air ticket question hr help desk ticket" },
  { id: "requests.access", section: "requests", group: "mine",
    label: { en: "Request access", ar: "طلب صلاحية" }, status: "live",
    archetype: "FA", roles: STAFF, route: me("access-request"),
    keywords: "E15 role access request" },
];
