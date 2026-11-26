// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import {
  attendanceLook,
  claimsWaiting,
  crewWaiting,
  draftWeeks,
  punchesToMatch,
} from "../../time/counts";
import { HR_GM, TEAM, WATCH } from "../../time/routes";
import type { Area } from "../types";

const at = (rest: string[]) => ({ section: "time-off" as const, rest });

/**
 * WP5 Time: attendance, rosters, overtime and balances, all under the
 * Time off route (`#/time-off/<page>`; the page itself stays as it was).
 * Map rows: T10 today, T14 register, T13 punches, T20 and T21 rosters,
 * T22 against shifts, T30 overtime, T31 crew, T04 balances.
 */
export const AREAS: readonly Area[] = [
  { id: "time.balances", section: "time", group: "leave",
    label: { en: "Leave balances", ar: "أرصدة الإجازات" }, status: "live",
    archetype: "LF", roles: TEAM, route: at(["balances"]),
    keywords: "annual sick unpaid days left entitlement" },
  { id: "time.today", section: "time", group: "attendance",
    label: { en: "Today", ar: "الحضور اليوم" }, status: "live",
    archetype: "LF", roles: WATCH, route: at(["attendance"]),
    count: attendanceLook,
    keywords: "clock in out present absent late who is in" },
  { id: "time.register", section: "time", group: "attendance",
    label: { en: "Register", ar: "سجل الحضور" }, status: "live",
    archetype: "LF", roles: WATCH, route: at(["register"]),
    keywords: "timesheet hours worked late absence month" },
  { id: "time.punches", section: "time", group: "attendance",
    label: { en: "Punches to match", ar: "بصمات بلا صاحب" }, status: "live",
    archetype: "LF", roles: HR_GM, route: at(["punches"]),
    count: punchesToMatch, keywords: "device reader badge unmatched" },
  { id: "time.roster", section: "time", group: "rosters",
    label: { en: "Rosters", ar: "المناوبات والجداول" },
    status: "live", archetype: "CA", roles: TEAM, route: at(["roster"]),
    keywords: "shift schedule rota rest day" },
  { id: "time.plan", section: "time", group: "rosters",
    label: { en: "Planning", ar: "تخطيط الجداول" }, status: "live",
    archetype: "LF", roles: HR_GM, route: at(["plan"]),
    count: draftWeeks, keywords: "publish draft week checks" },
  { id: "time.against", section: "time", group: "rosters",
    label: { en: "Against shifts", ar: "الحضور مقابل المناوبات" },
    status: "live", archetype: "RP", roles: TEAM, route: at(["against"]),
    keywords: "late absence overtime shift compare" },
  { id: "time.overtime", section: "time", group: "overtime",
    label: { en: "Overtime", ar: "العمل الإضافي" },
    status: "live", archetype: "LF", roles: TEAM, route: at(["overtime"]),
    count: claimsWaiting, keywords: "overtime claim pay extra hours" },
  { id: "time.crew", section: "time", group: "overtime",
    label: { en: "Crew overtime", ar: "العمل الإضافي للفريق" },
    status: "live", archetype: "LF", roles: TEAM,
    route: at(["overtime", "crew"]), count: crewWaiting,
    keywords: "overtime before pre-approval team" },
];
