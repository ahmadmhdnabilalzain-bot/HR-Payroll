import {
  AS_OF,
  budgetAskSeeds,
  budgetStatusOf,
  BUDGET_MAX_STEPS,
  BUDGET_STATUS_TEXT,
  budgetTotals,
  checkRequest,
  criteriaTemplate,
  daysToFillLeft,
  departmentText,
  HIRING_BUDGET_BASIS,
  HIRING_LAST_START,
  hiringBudget,
  hiringManagerFor,
  hiringRequests,
  hiringTimeline,
  jobCatalogue,
  jobDescriptionTemplate,
  jobTitleText,
  positionCost,
  REQUEST_BASIS,
  REQUEST_STATUS_TEXT,
  requestNumber,
  salaryBand,
  shortDateText,
  stagesTemplate,
  startTooSoon,
  stepText,
  timelineProgress,
  URGENCY_TEXT,
  type CandidateStage,
  type DemoCompany,
  type OfferStatus,
} from "@payroll/demo-data";
import { addDays } from "@payroll/engine";
import { sumExplain } from "../../components/explain/sum";
import { money } from "../../components/explain/types";
import type { HiringData } from "./hiring-types";

const NOT_IN = "Visa, medical, insurance, gratuity and employer costs " +
  "are not in the budget. Pension: Not computed.";

/** Hiring budget and requests. Imported only by adapter.ts. */
export function adaptHiring(c: DemoCompany, managerId: string)
  : HiringData {
  let budget: ReturnType<typeof hiringBudget> | null = null;
  let requests: ReturnType<typeof hiringRequests> | null = null;
  const costs = new Map<string, ReturnType<typeof positionCost>>();
  return {
    budget: () => (budget ??= hiringBudget(c)),
    budgetAsks: () => budgetAskSeeds(c),
    totals: (rows) => budgetTotals(rows),
    requests: () => (requests ??= hiringRequests(c, managerId)),
    roles: () => jobCatalogue(c).map((j) => ({ jobKey: j.jobKey,
      title: j.title, departmentIds: j.departmentIds,
      gradeMin: j.gradeMin, gradeMax: j.gradeMax }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    departments: () => c.departments.map((d) => ({ id: d.id,
      text: departmentText(d.id) })),
    cost: (grade, steps, startIso) => {
      const key = `${grade}:${steps}:${startIso}`;
      const hit = costs.get(key);
      if (hit !== undefined) return hit;
      const made = positionCost(c, grade, steps, startIso);
      costs.set(key, made);
      return made;
    },
    band: salaryBand,
    jobDescription: jobDescriptionTemplate,
    criteria: criteriaTemplate,
    stages: (id) => stagesTemplate(c, id),
    hiringManagerFor: (id) => hiringManagerFor(c, id),
    check: (d) => checkRequest(c, d),
    tooSoon: (iso, ttf) => startTooSoon(iso, ttf),
    timeline: (p) => hiringTimeline(p),
    progress: (p) => timelineProgress({ published: p.published,
      stages: p.stages as CandidateStage[],
      offers: p.offers as OfferStatus[], filled: p.filled }),
    daysLeft: (iso, ttf) => daysToFillLeft(iso, ttf),
    statusOf: (p) => budgetStatusOf({ requisition: p.requisition,
      stages: p.stages as CandidateStage[], taken: p.taken }),
    number: requestNumber,
    stepText,
    jobTitle: jobTitleText,
    departmentText,
    dateText: shortDateText,
    addDays,
    explain: {
      monthly: (key, title, cost) => sumExplain({ id: `hire-month:${key}`,
        title: "A full month's budget", subject: title,
        summary: "The grade and step the budget allows, as a full " +
          "month's gross pay.", resultLabel: "A full month, gross",
        parts: cost.parts.map((x) => ({ text: x.label,
          value: money(x.monthly) })), notComputed: [NOT_IN],
        scope: c.rulesScope }),
      firstYear: (key, title, cost) => sumExplain({
        id: `hire-year:${key}`,
        title: "First-year budget", subject: title,
        summary: `Twelve payroll months of gross pay from ` +
          `${cost.startText}.`, resultLabel: "First year, gross",
        parts: cost.months.map((x) => ({ text: x.part
          ? `${x.label} (part month)` : x.label, value: money(x.gross) })),
        notComputed: [NOT_IN], scope: c.rulesScope }),
      left: (key, title, p) => sumExplain({ id: `hire-left:${key}`,
        title: "Budget left", subject: title,
        summary: "The first-year budget less pay agreed and pay offered.",
        resultLabel: "Left", parts: [
          { text: "First-year budget", value: money(p.firstYear) },
          ...(p.committed === null ? [] : [{ text: `Less ` +
            `${p.committed.label.toLowerCase()}, ${p.committed.who}`,
          value: money(p.committed.amount), less: true }]),
          ...(p.offered === null ? [] : [{ text: `Less ` +
            `${p.offered.label.toLowerCase()}, ${p.offered.who}`,
          value: money(p.offered.amount), less: true }])],
        scope: c.rulesScope }),
      total: (label, rows) => sumExplain({ id: `hire-total:${label}`,
        title: label, subject: "Hiring budget",
        summary: "Each position in the list, added up.", resultLabel: label,
        parts: rows.map((r) => ({ text: r.title, value: money(r.value) })),
        emptyText: "No positions in the list", scope: c.rulesScope }),
      hire: (key, title, cost, headcount) => sumExplain({
        id: `hire-ask:${key}`, title: "First-year cost", subject: title,
        summary: `Twelve payroll months of gross pay from ` +
          `${cost.startText} at the foot of grade ${cost.grade}, for ` +
          (headcount === 1 ? "one person." : `each of ${headcount} ` +
            "people."), resultLabel: "First year, gross",
        parts: Array.from({ length: headcount }, (_, i) => ({
          text: headcount === 1 ? "Twelve payroll months"
            : `Person ${i + 1}, twelve payroll months`,
          value: money(cost.firstYear) })),
        notComputed: [NOT_IN], scope: c.rulesScope }),
      after: (key, title, p) => sumExplain({ id: `hire-after:${key}`,
        title: "Budget left", subject: title,
        summary: `${p.leftLabel}, less ${p.lessLabel.toLowerCase()}.`,
        resultLabel: "Left", parts: [
          { text: p.leftLabel, value: money(p.leftNow) },
          { text: `Less ${p.lessLabel.toLowerCase()}`,
            value: money(p.less), less: true }],
        scope: c.rulesScope }),
    },
    budgetBasis: HIRING_BUDGET_BASIS,
    requestBasis: REQUEST_BASIS,
    statusText: REQUEST_STATUS_TEXT,
    budgetStatusText: BUDGET_STATUS_TEXT,
    urgencyText: URGENCY_TEXT,
    maxSteps: BUDGET_MAX_STEPS,
    lastStart: HIRING_LAST_START,
    asOf: AS_OF,
  };
}
