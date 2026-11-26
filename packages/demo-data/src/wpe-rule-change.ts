import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  formatIsoDate,
  loadPayrollParams,
  selectPack,
  TraceBuilder,
  variableEarnings,
  type Fils,
  type PayslipInput,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { dateOf, duration, plural, type DisplayDate } from "./display";
import { departmentText, jobTitleText } from "./wp3";
import type { DemoCompany, DemoEmployee } from "./types";

/**
 * WPE rule change (S09): one pending change to the monthly pay rule
 * pack and what it would do to the next run. The change is
 * HYPOTHETICAL, written for the demo: it is not a change in the law
 * and no source gives it. The preview re-runs every October payslip
 * through the engine with the changed values (calculatePayslip with
 * overrides; for UAE nationals the engine's own overtime step, since
 * their payslips skip the pension step) and lists who moves and by how
 * much. Nothing here changes the October run or any other figure.
 */

export interface RuleChangeValue {
  /** The engine's param key in the "ae-payroll" pack. */
  key: "overtimeUpliftBps" | "nightOvertimeUpliftBps";
  label: string;
  from: number;
  to: number;
  fromText: string;
  toText: string;
}

export interface RuleChange {
  id: string;
  packId: "ae-payroll";
  packName: string;
  title: string;
  /** Always true here: the only change in the demo is a what-if. */
  hypothetical: true;
  /** One plain line said wherever the change is shown. */
  label: string;
  values: RuleChangeValue[];
  sourceText: string;
  proposedOn: DisplayDate;
  effectiveFrom: DisplayDate;
  nextRun: string;
  basisText: string;
}

export interface RuleChangeLine {
  label: string;
  before: Fils;
  after: Fils;
}

export interface RuleChangeRow {
  employeeId: string;
  name: string;
  department: string;
  overtimeText: string;
  beforeNet: Fils;
  afterNet: Fils;
  difference: Fils;
  grossDifference: Fils;
  lines: RuleChangeLine[];
  display: { before: string; after: string; difference: string };
  /** The notice this person would get, in plain words. */
  notice: string;
}

export interface RuleChangePreview {
  change: RuleChange;
  /** Every payslip of the October run, re-run. */
  checked: number;
  rows: RuleChangeRow[];
  unchanged: number;
  totals: { beforeNet: Fils; afterNet: Fils; difference: Fils;
    grossDifference: Fils; employerCostDifference: Fils };
  summaryText: string;
  noticeSubject: string;
  noticeFrom: { employeeId: string; name: string; title: string };
  deciders: { hr: { employeeId: string; name: string };
    gm: { employeeId: string; name: string } };
}

const PCT = (bps: number): string => `${bps / 100}%`;

/** The one pending change (fictional, for demonstration). */
export const RULE_CHANGE_VALUES: readonly RuleChangeValue[] = [
  { key: "overtimeUpliftBps", label: "Overtime uplift, day",
    from: 2500, to: 3000, fromText: PCT(2500), toText: PCT(3000) },
  { key: "nightOvertimeUpliftBps", label: "Overtime uplift, night",
    from: 5000, to: 6000, fromText: PCT(5000), toText: PCT(6000) },
];

const EFFECTIVE = "2026-11-01";
const HYPO = "Hypothetical, for demonstration. Not a change in the law.";

export function ruleChange(): RuleChange {
  return { id: "rc-2026-11-overtime", packId: "ae-payroll",
    packName: "Monthly pay", hypothetical: true,
    title: "Overtime uplift: day 25% to 30%, night 50% to 60%",
    label: HYPO, values: [...RULE_CHANGE_VALUES],
    sourceText: "No source. A what-if written to show how " +
      "a rule change is checked before it applies. The rule set in " +
      "force keeps 25% and 50%.",
    proposedOn: dateOf(AS_OF), effectiveFrom: dateOf(EFFECTIVE),
    nextRun: "November 2026",
    basisText: "October 2026 hours and pay, re-run by the payroll with " +
      "the changed values. November's own hours will differ, so this " +
      "is an estimate of the next run." };
}

const OVERRIDES = (): Record<string, number> => Object.fromEntries(
  RULE_CHANGE_VALUES.map((v) => [v.key, v.to]));

const signed = (f: bigint): string => f === 0n ? formatAed(fils(0n))
  : f > 0n ? `+${formatAed(fils(f))}` : formatAed(fils(f));

const sum = (xs: { amount: Fils }[]): bigint =>
  xs.reduce((n, x) => n + x.amount, 0n);

/** The engine's overtime step for a national, before and after. */
function nationalOvertime(input: PayslipInput, ov?: Record<string, number>)
  : { label: string; amount: Fils }[] {
  const onDate = formatIsoDate({ y: input.year, m: input.month, d: 1 });
  const p = loadPayrollParams(selectPack(DEFAULT_PAYROLL_PACKS.payroll,
    onDate), ov);
  return variableEarnings(input, p, new TraceBuilder()).lines;
}

function overtimeText(input: PayslipInput): string {
  const all = input.overtime.reduce((n, o) => n + o.minutes, 0);
  const night = input.overtime.reduce((n, o) => n + o.nightMinutes, 0);
  const day = all - night;
  const parts = [day > 0 ? `${duration(day)} by day` : "",
    night > 0 ? `${duration(night)} at night` : ""].filter((x) => x);
  return parts.length === 0 ? "No overtime" : parts.join(", ");
}

type Earning = { label: string; kind: string; amount: Fils };

function linesOf(before: Earning[], after: Earning[]): RuleChangeLine[] {
  const ot = (xs: Earning[]) => xs.filter((x) => x.kind === "overtime");
  const a = ot(after);
  return ot(before).map((x, i) => ({ label: x.label, before: x.amount,
    after: a[i]?.amount ?? fils(0n) }))
    .filter((l) => l.before !== l.after);
}

const byId = (c: DemoCompany, id: string): DemoEmployee =>
  c.employees.find((e) => e.id === id)!;

function noticeOf(c: DemoCompany, e: DemoEmployee, r: { before: Fils;
  after: Fils; diff: bigint; ot: string }, from: string): string {
  const ch = ruleChange();
  const first = e.fullName.split(" ")[0] ?? e.fullName;
  return [`Dear ${first},`,
    `We are planning a change to how overtime is paid from the ` +
      `${ch.nextRun} run. ${HYPO}`,
    `Overtime at night would be paid at 60% above your hourly basic ` +
      "pay instead of 50%, and other overtime at 30% instead of 25%.",
    `On your October hours (${r.ot.toLowerCase()}), your net pay ` +
      `would have been ${formatAed(r.after)} instead of ` +
      `${formatAed(r.before)}, ${signed(r.diff)}. Your November pay ` +
      "depends on the hours you work.",
    `If you have a question, reply to this note or ask HR.`,
    `${from}, ${c.company.name}`].join("\n\n");
}

const CACHE = new WeakMap<DemoCompany, RuleChangePreview>();

/** Who the change moves in the next run, worked out by the engine. */
export function ruleChangePreview(c: DemoCompany): RuleChangePreview {
  const hit = CACHE.get(c);
  if (hit !== undefined) return hit;
  const ov = OVERRIDES();
  const run = c.approvals.find((a) => a.kind === "pay-run")!;
  const hr = byId(c, run.makerEmployeeId);
  const gm = byId(c, run.checkerEmployeeId);
  const hrTitle = jobTitleText(hr.jobKey);
  const rows: RuleChangeRow[] = [];
  let employerCost = 0n;
  for (const s of c.payRun.payslips) {
    const e = byId(c, s.employeeId);
    const ot = overtimeText(s.input);
    if (s.basis === "calculatePayslip") {
      const now = calculatePayslip(s.input, DEFAULT_PAYROLL_PACKS).value;
      if (now.net !== s.payslip.net) {
        throw new Error(`RULE_CHANGE_BASE_DIFFERS: ${e.id}`);
      }
      const next = calculatePayslip(s.input, DEFAULT_PAYROLL_PACKS, ov)
        .value;
      const diff = next.net - now.net;
      employerCost += next.employerCost - now.employerCost;
      if (diff === 0n && next.gross === now.gross) continue;
      rows.push({ employeeId: e.id, name: e.fullName,
        department: departmentText(e.departmentId), overtimeText: ot,
        beforeNet: now.net, afterNet: next.net, difference: fils(diff),
        grossDifference: fils(next.gross - now.gross),
        lines: linesOf(now.earnings, next.earnings),
        display: { before: formatAed(now.net), after: formatAed(next.net),
          difference: signed(diff) },
        notice: noticeOf(c, e, { before: now.net, after: next.net, diff,
          ot }, hr.fullName) });
    } else {
      // A national's payslip skips the pension step; the change can
      // only reach it through the overtime step, checked here.
      const was = sum(nationalOvertime(s.input));
      const will = sum(nationalOvertime(s.input, ov));
      if (was !== will) {
        throw new Error(`RULE_CHANGE_NATIONAL_MOVES: ${e.id}`);
      }
    }
  }
  rows.sort((a, b) => a.difference > b.difference ? -1
    : a.difference < b.difference ? 1 : a.name.localeCompare(b.name));
  const beforeNet = c.payRun.totals.net;
  const difference = rows.reduce((n, r) => n + r.difference, 0n);
  const checked = c.payRun.payslips.length;
  const out: RuleChangePreview = {
    change: ruleChange(), checked, rows,
    unchanged: checked - rows.length,
    totals: { beforeNet, afterNet: fils(beforeNet + difference),
      difference: fils(difference),
      grossDifference: fils(rows.reduce((n, r) =>
        n + r.grossDifference, 0n)),
      employerCostDifference: fils(employerCost) },
    summaryText: `${plural(checked, "payslip", "payslips")} re-run; ` +
      `${plural(rows.length, "person changes", "people change")}, ` +
      `${checked - rows.length} stay the same. The run's net pay ` +
      `moves by ${signed(difference)}.`,
    noticeSubject: `Planned change to overtime pay from the ` +
      `${ruleChange().nextRun} run (hypothetical, for demonstration)`,
    noticeFrom: { employeeId: hr.id, name: hr.fullName, title: hrTitle },
    deciders: { hr: { employeeId: hr.id, name: hr.fullName },
      gm: { employeeId: gm.id, name: gm.fullName } },
  };
  CACHE.set(c, out);
  return out;
}
