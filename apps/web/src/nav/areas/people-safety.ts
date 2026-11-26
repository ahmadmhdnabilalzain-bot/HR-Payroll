// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { logRows } from "../../time/finish/views";
import type { Area, AreaRoute, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;
const safety = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest: ["safety", ...rest] });

const openIncidents = (c: NavCtx): number => {
  const m = c.state.safetyMarks;
  return logRows(c.data, c.state).filter((i) => (m[`inc:${i.id}`]?.status
    ?? i.status) !== "closed").length;
};
const cardsPending = (c: NavCtx): number =>
  c.data.safety.cover().filter((r) => r.status === "card-pending" &&
    c.state.safetyMarks[`card:${r.employeeId}`] === undefined).length;
const iloeDue = (c: NavCtx): number =>
  c.data.safety.iloe().filter((r) => r.status === "due").length;

/** WP15: health insurance, safety incidents, ILOE and policies. */
export const AREAS: readonly Area[] = [
  { id: "people.insurance", section: "people", group: "compliance",
    label: { en: "Health insurance", ar: "التأمين الصحي" },
    status: "live", archetype: "LF", roles: HR_GM, route: safety("insurance"),
    count: cardsPending,
    keywords: "P46 health insurance medical card cover renewal covered" },
  { id: "people.incidents", section: "people", group: "compliance",
    label: { en: "Safety incidents", ar: "حوادث السلامة" },
    status: "live", archetype: "LF", roles: HR_GM, route: safety("incidents"),
    count: openIncidents,
    keywords: "P48 health and safety incident slip fire drill injury " +
      "accident near miss" },
  { id: "people.iloe", section: "people", group: "compliance",
    label: { en: "ILOE insurance", ar: "تأمين فقدان الوظيفة" },
    status: "live", archetype: "LF", roles: HR_GM, route: safety("iloe"),
    count: iloeDue,
    keywords: "P52 iloe unemployment insurance subscription involuntary " +
      "loss of employment" },
  { id: "people.policies", section: "people", group: "compliance",
    label: { en: "Policies", ar: "إصدارات السياسات" },
    status: "live", archetype: "LF", roles: HR_GM, route: safety("policies"),
    keywords: "P53 policy handbook version read acknowledged code of " +
      "conduct" },
  { id: "reports.safety-incidents", section: "reports", group: "people",
    label: { en: "Safety incidents report", ar: "تقرير حوادث السلامة" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["safety-incidents"] },
    keywords: "safety report incidents by month severity" },
];
