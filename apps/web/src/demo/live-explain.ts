import {
  COUNT_RULE,
  one,
  people,
  sumExplain,
} from "../components/explain/sum";
import { count, type Explanation } from "../components/explain/types";
import { formatDayMonth } from "../i18n/format";
import type {
  Approval,
  DemoData,
  DocumentExpiry,
  Issue,
} from "./data/types";
import type { RequestRow } from "./time-off";

/**
 * Explanations for the counts that move as the demo is used (what is
 * waiting, what is open, who is away today), built from the same list
 * the screen counts. A lazy chunk (live-explain-load.ts): only plain
 * data comes in, so the figure and its working cannot differ.
 */

const name = (d: DemoData, id: string | null): string =>
  id === null ? "" : d.employee(id).name.en;

const items = (n: number): string => `${n} ${n === 1 ? "item" : "items"}`;
const docs = (n: number): string =>
  `${n} ${n === 1 ? "document" : "documents"}`;
const requests = (n: number): string =>
  `${n} ${n === 1 ? "request" : "requests"}`;

/** Problems that stop pay: each open check counts once. */
export function issuesExplain(d: DemoData, open: Issue[], scope: string)
  : Explanation {
  return sumExplain({ id: "live:issues", title: "Open items that stop pay",
    subject: "October pay run",
    summary: "Each check on the run that must be fixed before it can be " +
      "signed off, counted once.", resultLabel: "Open items",
    countText: items, parts: open.map((i) => one(
      [i.title.en, name(d, i.employeeId)].filter((x) => x !== "")
        .join(": "))), rules: [COUNT_RULE], scope });
}

/** What waits for a decision, as the approvals inbox lists it. */
export function waitingExplain(d: DemoData, list: Approval[],
  scope: string): Explanation {
  return sumExplain({ id: "live:waiting", title: "Waiting for a decision",
    subject: "Approvals inbox",
    summary: "Each request in the approvals inbox that nobody has " +
      "decided yet, counted once.", resultLabel: "Waiting",
    countText: requests, parts: list.map((a) => one(
      `${a.title.en}, for ${name(d, a.checkerId)}`)),
    rules: [COUNT_RULE], scope });
}

/** Who is away on the demo date, booked or waiting. */
export function onLeaveExplain(d: DemoData, rows: RequestRow[],
  scope: string): Explanation {
  return sumExplain({ id: "live:on-leave", title: "On leave today",
    subject: "Whole company",
    summary: "Everyone with leave booked or waiting that covers the " +
      "demo date, counted once each.", resultLabel: "On leave",
    countText: people, parts: rows.map((r) => one(
      `${name(d, r.employeeId)}, ${formatDayMonth(r.startDate, "en")} to ` +
      formatDayMonth(r.endDate, "en"))), rules: [COUNT_RULE], scope });
}

/** Documents in a window of days, one line each. */
export function docsExplain(d: DemoData, list: DocumentExpiry[],
  title: string, window: string, scope: string): Explanation {
  return sumExplain({ id: `live:docs:${title}`, title,
    subject: "Visas, Emirates IDs and passports",
    summary: `Each document that ${window}, counted once.`,
    resultLabel: "Documents", countText: docs,
    parts: list.map((x) => one(`${name(d, x.employeeId)}: ` +
      `${x.kind.en}, ${x.daysLeft < 0 ? "ended" : "ends"} ` +
      formatDayMonth(x.expiresOn, "en"))), rules: [COUNT_RULE], scope });
}

/** People on this run's payroll, by department. */
export function headcountExplain(d: DemoData, scope: string): Explanation {
  return sumExplain({ id: "live:headcount", title: "People on the payroll",
    subject: "October pay run",
    summary: "One payslip per person on the October run, counted by " +
      "department.", resultLabel: "People", countText: people,
    parts: d.departments().filter((x) => x.headcount > 0).map((x) => ({
      text: x.name.en, value: count(x.headcount, people(x.headcount)) })),
    rules: [COUNT_RULE], scope });
}
