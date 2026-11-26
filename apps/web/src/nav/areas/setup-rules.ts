// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area } from "../types";

const HR_GM = ["hr", "gm"] as const;

const area = (id: string, group: string, en: string, ar: string,
  archetype: Area["archetype"], page: string[], keywords: string): Area =>
  ({ id, section: "setup", group, label: { en, ar }, status: "live",
    archetype, roles: HR_GM, route: { section: "setup",
      rest: ["rules", ...page] }, keywords });

/**
 * WP8: Setup, the rules (navigation map, sections 7 and 8). Each
 * screen reads the engine's rule packs or the demo data; none keeps a
 * figure of its own. Routes are `#/setup/rules/<page>`.
 */
export const AREAS: readonly Area[] = [
  area("setup.rule-packs", "time", "Rules and sources",
    "القواعد ومصادرها", "LF", ["packs"],
    "rule packs law updates source official secondary convention " +
      "change log version"),
  area("setup.leave", "time", "Leave policies", "سياسات الإجازات", "ST",
    ["leave"], "annual sick maternity unpaid carry over entitlement " +
      "leave types"),
  area("setup.hours", "time", "Working hours",
    "ساعات العمل والعمل الإضافي", "ST", ["hours"],
    "working hours overtime rate night shift rest day week"),
  area("setup.holidays", "time", "Holidays",
    "الإجازات الرسمية وساعات رمضان", "ST", ["holidays"],
    "holidays ramadan hours public holiday shorter day"),
  area("setup.eos", "pay", "End-of-service rules",
    "قواعد نهاية الخدمة", "ST", ["end-of-service"],
    "gratuity notice probation settlement"),
  area("setup.deductions", "pay", "Deductions rules", "قواعد الاستقطاعات",
    "ST", ["deductions"], "deduction limit loan fine cap half wage"),
  area("setup.calendar", "pay", "Pay calendar", "تقويم الرواتب", "CA",
    ["calendar"], "cut-off payday approve date month"),
  area("setup.wps", "pay", "WPS file", "نظام حماية الأجور",
    "ST", ["wps"], "wps bank file salary file sif iban routing"),
  area("setup.company", "data", "Company details", "بيانات الشركة", "ST",
    ["company"], "company name locations departments"),
];
