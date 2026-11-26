import {
  employeeById,
  payrollHistory,
  reportMonth,
  type DemoCompany,
  type MonthlyPayroll,
  type Variance,
} from "@payroll/demo-data";
import { fils } from "@payroll/engine";
import {
  COUNT_RULE,
  people,
  sumExplain,
  SUM_RULE,
  type Part,
} from "../components/explain/sum";
import {
  count,
  money,
  text,
  type Explanation,
  type ExplainRule,
} from "../components/explain/types";
import { dayCountVars } from "../people/words";
import { hours, turnoverText } from "./fmt";
import type { DeptHeads, LeavePerson } from "./types";

/**
 * The working behind the report pages' figures (a lazy chunk, with
 * source.ts). Each total is the package's own parts added up: payroll
 * history lines by department or person, variance causes person by
 * person, headcount by department, leave by department.
 */

const HISTORY = "Pay run history";

const HISTORY_RULE: ExplainRule = {
  text: "January to September are worked out again by the same engine " +
    "from today's pay and joining dates; October is the run as it " +
    "stands.", status: "convention", statusLabel: null,
  citation: "Our own working, as we apply it",
};

const CAUSE_RULE: ExplainRule = {
  text: "Each person's change goes under the one cause their record " +
    "shows: joined, left, unpaid leave, overtime, back pay, a salary " +
    "raise or a sick day unpaid in probation.",
  status: "convention", statusLabel: null,
  citation: "Our own working, as we apply it",
};

const days = (n: number): string => {
  const v = dayCountVars(n, "en");
  return `${v.n} ${v.count === 1 ? "day" : "days"}`;
};

/** Department names by employee id, from the company records. */
type DeptName = (employeeId: string) => string;

function byDepartment(lines: MonthlyPayroll["lines"], dept: DeptName,
  order: string[], f: (l: MonthlyPayroll["lines"][number]) => bigint)
  : Part[] {
  return order.map((d) => {
    const mine = lines.filter((l) => dept(l.employeeId) === d);
    return { d, mine };
  }).filter((x) => x.mine.length > 0).map((x) => ({
    text: `${x.d} (${people(x.mine.length)})`,
    value: money(fils(x.mine.reduce((n, l) => n + f(l), 0n))) }));
}

/** Gross and net for each month, both totals, and overtime. */
export function historyExplains(c: DemoCompany, dept: DeptName,
  order: string[]): Record<string, Explanation> {
  const out: Record<string, Explanation> = {};
  const put = (e: Explanation): void => {
    out[e.id] = e;
  };
  const h = payrollHistory(c);
  const scope = c.rulesScope;
  const name = (id: string): string => employeeById(c, id).fullName;
  for (const m of h) {
    const label = reportMonth(m.month);
    const state = m.status === "paid" ? "as paid" : "waiting for approval";
    put(sumExplain({ id: `trend:${m.month}`, title: `Gross pay, ${label}`,
      subject: `${label} run, ${state}`,
      summary: `Every payslip's gross pay in ${label}, added up by ` +
        "department.", resultLabel: "Gross pay",
      parts: byDepartment(m.lines, dept, order, (l) => l.gross),
      inputs: [{ label: "Payslips", value: count(m.headcount,
        String(m.headcount)), from: HISTORY }],
      rules: [SUM_RULE, HISTORY_RULE], scope }));
    put(sumExplain({ id: `trend-net:${m.month}`, title: `Net pay, ${label}`,
      subject: `${label} run, ${state}`,
      summary: `Every payslip's net pay in ${label}, added up by ` +
        "department.", resultLabel: "Net pay",
      parts: byDepartment(m.lines, dept, order, (l) => l.net),
      rules: [SUM_RULE, HISTORY_RULE], scope }));
    const ot = m.lines.filter((l) => l.overtimeMinutes > 0);
    put(sumExplain({ id: `overtime:${m.month}`,
      title: `Overtime cost, ${label}`, subject: `${label} run`,
      summary: "The overtime lines of each payslip, added up. Each is " +
        "worked out by the pay rules from the hours on the timesheet.",
      resultLabel: "Overtime cost",
      parts: ot.map((l) => ({ text: `${name(l.employeeId)}, ` +
        `${hours(l.overtimeMinutes)} hours`,
      value: money(l.overtimeAmount) })),
      rules: [SUM_RULE, HISTORY_RULE], scope }));
  }
  const first = reportMonth(h[0]!.month);
  const last = reportMonth(h.at(-1)!.month);
  put(sumExplain({ id: "trend:total", title: `Gross pay, ${first} to ` +
    last, subject: "Whole company",
    summary: "Each month's gross pay, added up. Each month is itself " +
      "the sum of its payslips.", resultLabel: "Gross pay",
    parts: h.map((m) => ({ text: reportMonth(m.month),
      value: money(m.gross) })),
    rules: [SUM_RULE, HISTORY_RULE], scope }));
  put(sumExplain({ id: "overtime:total", title: "Overtime paid this year",
    subject: `${first} to ${last}`,
    summary: "Each month's overtime cost, added up.",
    resultLabel: "Overtime cost",
    parts: h.map((m) => ({ text: reportMonth(m.month),
      value: money(m.overtimeAmount) })),
    rules: [SUM_RULE, HISTORY_RULE], scope }));
  const paid = h.filter((m) => m.status === "paid");
  put(sumExplain({ id: "trend:paid", title: `Gross pay, ${first} to ` +
    reportMonth(paid.at(-1)!.month), subject: "Months already paid",
    summary: "Each paid month's gross pay, added up.",
    resultLabel: "Gross pay", parts: paid.map((m) => ({
      text: reportMonth(m.month), value: money(m.gross) })),
    rules: [SUM_RULE, HISTORY_RULE], scope }));
  return out;
}

/** The change in gross by cause, and each cause person by person. */
export function varianceExplains(c: DemoCompany, v: Variance)
  : { explanation: Explanation; driverExplain: Record<string,
    Explanation> } {
  const h = payrollHistory(c);
  const now = h.find((m) => m.month === v.month)!;
  const base = h.find((m) => m.month === v.against)!;
  const before = new Map(base.lines.map((l) => [l.employeeId, l]));
  const monthLabel = reportMonth(v.month);
  const againstLabel = reportMonth(v.against);
  const subject = `${monthLabel} against ${againstLabel}`;
  const partOf = (key: string, id: string): bigint => {
    const l = now.lines.find((x) => x.employeeId === id)!;
    const old = before.get(id);
    if (key === "new-joiner" || old === undefined) return l.gross;
    if (key === "back-pay") return l.backPay;
    return l.gross - old.gross - l.backPay;
  };
  const scope = c.rulesScope;
  const driverExplain: Record<string, Explanation> = {};
  for (const d of v.drivers) {
    driverExplain[d.key] = sumExplain({ id: `driver:${v.month}:${d.key}`,
      title: d.label, subject,
      summary: "Each person's change in gross under this cause, added " +
        "up.", resultLabel: "Change in gross",
      parts: d.people.map((id) => ({ text: employeeById(c, id).fullName,
        value: money(fils(partOf(d.key, id))) })),
      rules: [CAUSE_RULE, SUM_RULE], scope });
  }
  const explanation = sumExplain({ id: `variance:${v.month}`,
    title: "Change in gross pay", subject,
    summary: "Each person's change is put under the one cause the " +
      "records show for them, so the causes add up to the whole change.",
    resultLabel: "Change in gross",
    parts: v.drivers.map((d) => ({ text: d.label,
      value: money(d.amount) })),
    inputs: [{ label: `${againstLabel} gross`, value: money(base.gross),
      from: `${HISTORY}, worked out again` },
    { label: `${monthLabel} gross`, value: money(now.gross),
      from: HISTORY }],
    rules: [CAUSE_RULE, SUM_RULE],
    after: [{ text: `${againstLabel} gross, plus the change`,
      value: money(base.gross), op: "add" },
    { text: "Change in gross", value: money(v.grossChange), op: "add" },
    { text: `${monthLabel} gross`, value: money(now.gross), op: "total" },
    { text: `${monthLabel} gross`, value: money(now.gross), op: "add" },
    { text: `Less ${againstLabel} gross`, value: money(base.gross),
      op: "less" },
    { text: "Change in gross", value: money(v.grossChange), op: "total" }],
    scope });
  return { explanation, driverExplain };
}

/** People now, and turnover, from the headcount by department. */
export function headsExplains(c: DemoCompany, heads: DeptHeads[],
  total: DeptHeads, joiners: string[], leavers: string[])
  : Record<string, Explanation> {
  const scope = c.rulesScope;
  const parts = (k: "start" | "now"): Part[] => heads
    .filter((d) => d[k] > 0).map((d) => ({ text: d.name,
      value: count(d[k], people(d[k])) }));
  const now = sumExplain({ id: "headcount:now",
    title: "People on the payroll", subject: "Whole company",
    summary: "Everyone employed on the demo date, counted by department.",
    resultLabel: "People", countText: people, parts: parts("now"),
    rules: [COUNT_RULE], scope });
  const avg = (total.start + total.now) / 2;
  const turnover: Explanation = { id: "turnover:total",
    title: "Turnover this year", subject: "Whole company",
    summary: "The people who left this year, divided by the average of " +
      "the headcount on 1 January and now.",
    result: { label: "Turnover", value: text(turnoverText(total)) },
    inputs: [{ label: "Joined this year", value: text(joiners.join(", ") ||
      "Nobody"), from: "Employee records" },
    { label: "Left this year", value: text(leavers.join(", ") ||
      "Nobody"), from: "Employee records" }],
    rules: [{ text: "Turnover is the people who left divided by the " +
      "average headcount for the period, as we read common practice.",
    status: "convention", statusLabel: null,
    citation: "Our own working, as we apply it" }],
    steps: [
      { text: "Headcount on 1 January", value: count(total.start,
        people(total.start)), op: "add" },
      { text: "Headcount now", value: count(total.now, people(total.now)),
        op: "add" },
      { text: "Both together", value: count(total.start + total.now,
        people(total.start + total.now)), op: "total" },
      { text: "Half of that is the average headcount",
        value: text(String(avg)) },
      { text: "People who left this year", value: count(total.departed,
        people(total.departed)) },
      { text: "Left divided by the average, to one decimal",
        value: text(turnoverText(total)) },
    ], notComputed: [], scope };
  return { [now.id]: now, [turnover.id]: turnover };
}

/** Annual leave left across everyone, by department. */
export function leaveExplain(c: DemoCompany, all: LeavePerson[],
  order: string[]): Explanation {
  return sumExplain({ id: "leave:annual-left",
    title: "Annual leave left", subject: "Whole company",
    summary: "Each person's annual leave balance on the demo date, " +
      "added up by department. Days are working days.",
    resultLabel: "Annual leave left", countText: days,
    parts: order.map((d) => all.filter((p) => p.department === d))
      .filter((xs) => xs.length > 0).map((xs) => {
        const n = xs.reduce((a, p) => a + p.annualLeft, 0);
        return { text: `${xs[0]!.department} (${people(xs.length)})`,
          value: count(n, days(n)) };
      }),
    rules: [{ text: "A balance is the year's entitlement less the days " +
      "taken and booked, from the leave records.", status: "convention",
    statusLabel: null, citation: "Our own working, as we apply " +
      "it" }], scope: c.rulesScope });
}
