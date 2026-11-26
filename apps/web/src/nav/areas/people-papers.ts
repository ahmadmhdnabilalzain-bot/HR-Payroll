// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import {
  complianceRows,
  letterIsOpen,
  letterRows,
  requestIsOpen,
  requestRows,
  warningRows,
} from "../../people/papers/model";
import type { Area, AreaRoute, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;
const papers = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest: ["papers", ...rest] });

const waitingRequests = (c: NavCtx): number =>
  requestRows(c.data, c.state).filter(requestIsOpen).length;
const waitingLetters = (c: NavCtx): number =>
  letterRows(c.data, c.state).filter(letterIsOpen).length;
const draftWarnings = (c: NavCtx): number =>
  warningRows(c.data, c.state).filter((w) => w.status === "draft").length;
const attention = (c: NavCtx): number =>
  complianceRows(c.data, c.state).filter((r) => r.attention).length;

/** WP4: requests and letters, documents and visas, compliance. */
export const AREAS: readonly Area[] = [
  { id: "people.staff-requests", section: "people", group: "requests",
    label: { en: "Staff requests", ar: "طلبات الموظفين" },
    status: "live", archetype: "LF", roles: HR_GM, route: papers("requests"),
    count: waitingRequests,
    keywords: "queue requests raise bank details air ticket profile change" },
  { id: "people.letters", section: "people", group: "requests",
    label: { en: "Letters", ar: "الخطابات" },
    status: "live", archetype: "FA", roles: HR_GM, route: papers("letters"),
    count: waitingLetters,
    keywords: "salary certificate noc no objection experience letter" },
  { id: "people.visas", section: "people", group: "papers",
    label: { en: "Visas", ar: "التأشيرات" },
    status: "live", archetype: "LF", roles: HR_GM, route: papers("visas"),
    keywords: "visa residence emirates id renewal government cases" },
  { id: "people.warnings", section: "people", group: "compliance",
    label: { en: "Warnings", ar: "الإنذارات" },
    status: "live", archetype: "LF", roles: HR_GM,
    route: papers("warnings"), count: draftWarnings,
    keywords: "disciplinary warning conduct late" },
  { id: "people.compliance", section: "people", group: "compliance",
    label: { en: "Compliance", ar: "الامتثال" },
    status: "live", archetype: "LF", roles: HR_GM,
    route: papers("compliance"), count: attention,
    keywords: "compliance overview checks due" },
  { id: "people.calendar", section: "people", group: "compliance",
    label: { en: "Due dates", ar: "تقويم الامتثال" },
    status: "live", archetype: "CA", roles: HR_GM,
    route: papers("calendar"), keywords: "due dates calendar expiry" },
  { id: "people.emiratisation", section: "people", group: "compliance",
    label: { en: "Emiratisation", ar: "التوطين" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: papers("emiratisation"),
    keywords: "emiratisation nafis nationals headcount" },
  { id: "people.pension", section: "people", group: "compliance",
    label: { en: "Pension", ar: "المعاشات" },
    status: "live", archetype: "LF", roles: HR_GM, route: papers("pension"),
    keywords: "pension gpssa retirement fund nationals" },
];
