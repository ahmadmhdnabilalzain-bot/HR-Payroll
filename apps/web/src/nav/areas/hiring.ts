// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { hiringTasks } from "../../people/hiring/model";
import type { Area, AreaRoute, NavCtx } from "../types";

/**
 * Hiring budget (P20, was "Cost of hire") and hiring requests (P10):
 * positions management has budgeted, and requests from "Request a
 * hire" to an open position. HR and the General manager see all; a
 * manager raises and follows their own team's requests; IT and the
 * employee see none (the view turns them away too).
 */
const HR_GM = ["hr", "gm"] as const;
const go = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest: ["hiring", ...rest] });
const waiting = (c: NavCtx): number => hiringTasks(c.data, c.state)
  .filter((t) => t.urgency !== "overdue" &&
    !t.id.startsWith("hiring:budget:")).length;

export const AREAS: readonly Area[] = [
  { id: "people.hiring-budget", section: "people", group: "hiring",
    label: { en: "Hiring budget", ar: "ميزانية التوظيف" },
    status: "live", archetype: "LF", roles: HR_GM, route: go("budget"),
    count: (c) => c.state.role === "gm" ? hiringTasks(c.data, c.state)
      .filter((t) => t.id.startsWith("hiring:budget:")).length : 0,
    keywords: "P20 hiring budget cost of hire position budget budgeted " +
      "headcount first year spend committed sign off" },
  { id: "people.hiring-requests", section: "people", group: "hiring",
    label: { en: "Hiring requests", ar: "طلبات التوظيف" },
    status: "live", archetype: "FA", roles: HR_GM,
    route: go("requests"), count: waiting,
    keywords: "P10 hiring request requisition request a hire new " +
      "position job description criteria time to fill timeline" },
  { id: "requests.hire", section: "requests", group: "mine",
    label: { en: "Request a hire", ar: "طلب توظيف" },
    status: "live", archetype: "FA", roles: ["manager"],
    route: go("requests"), count: waiting,
    keywords: "P10 request a hire hiring new person team position" },
];
