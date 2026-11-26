import type { Area, AreaRoute } from "../types";

/** WP25: compensation and workforce plans, budget and forecast. */
const HR_GM = ["hr", "gm"] as const;
const rep = (...rest: string[]): AreaRoute =>
  ({ section: "reports", rest });

export const AREAS: readonly Area[] = [
  { id: "people.comp-plan", section: "people", group: "growth",
    label: { en: "Compensation planning", ar: "تخطيط التعويضات" },
    status: "live", archetype: "LF", roles: HR_GM, route: rep("comp-plan"),
    count: (c) => Object.keys(c.state.planProposals).filter((id) =>
      !c.state.planBatches.some((b) => b.items.some((i) =>
        i.employeeId === id))).length,
    keywords: "P67 compensation planning merit increase raise guideline " +
      "rating pool batch 2027" },
  { id: "people.workforce-plan", section: "people", group: "growth",
    label: { en: "Workforce planning", ar: "تخطيط القوى العاملة" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: rep("workforce-plan"),
    keywords: "P68 workforce planning headcount seats vacancies leavers " +
      "budget 2027 positions" },
  { id: "reports.cost-budget", section: "reports", group: "finance",
    label: { en: "Cost and budget", ar: "التكلفة والميزانية" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: rep("cost-budget"),
    keywords: "X13 cost budget actual department month over under" },
  { id: "reports.forecast", section: "reports", group: "finance",
    label: { en: "Payroll forecast", ar: "توقعات الرواتب" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: rep("forecast"),
    keywords: "X35 payroll forecast plan actual estimate november " +
      "december" },
];
