// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { HR_GM } from "../../time/routes";
import type { Area } from "../types";

const STAFF = ["manager", "employee"] as const;
const more = (...rest: string[]) =>
  ({ section: "time-off" as const, rest: ["more", ...rest] });

/**
 * WP31, Time and safety finish: comp-off days and leave grants (T07,
 * Time, HR and the General manager) and an employee's safety incident
 * report (E14, My pages), which lands in the HR incidents log.
 */
export const AREAS: readonly Area[] = [
  { id: "time.comp-off", section: "time", group: "leave",
    label: { en: "Comp-off days", ar: "أيام التعويض" }, status: "live",
    archetype: "LF", roles: HR_GM, route: more("comp-off"),
    keywords: "T07 comp-off compensatory day off public holiday worked " +
      "balance expiry earned" },
  { id: "time.grants", section: "time", group: "leave",
    label: { en: "Leave grants", ar: "منح الإجازة" }, status: "live",
    archetype: "FA", roles: HR_GM, route: more("grants"),
    keywords: "T07 leave grant extra days one-off general manager gift " +
      "sign off" },
  { id: "me.report-incident", section: "me", group: "mine",
    label: { en: "Report an incident", ar: "الإبلاغ عن حادث سلامة" },
    status: "live", archetype: "FA", roles: STAFF,
    route: { section: "me", rest: ["report-incident"] },
    keywords: "E14 report safety incident accident injury near miss " +
      "slip fall hazard tell HR" },
];
