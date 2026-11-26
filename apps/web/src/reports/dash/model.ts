import { fils, type Fils } from "@payroll/engine";
import type { DemoData, DepartmentRow } from "../../demo/data/types";
import { waitingCount } from "../../demo/approvals";
import { figures } from "../../demo/figures";
import type { DemoState } from "../../demo/state";
import type { MonthRow, ReportsSource } from "../types";

/**
 * The dashboards' tiles as plain data: every figure is read from a
 * selector that another screen already shows, so a test can hold each
 * tile to its source. Components only draw what these return.
 */

export type Figure =
  | { kind: "money"; fils: Fils }
  | { kind: "count"; n: number; unit?: string };

export type Change =
  | { kind: "money"; fils: Fils; against: string }
  | { kind: "count"; n: number; against: string; unit?: string }
  | null;

export interface TileModel {
  id: string;
  label: string;
  figure: Figure;
  /** Against last month, when there is a last month. */
  change: Change;
  /** Oldest to newest, for the sparkline (the last is this month). */
  series?: number[];
  /** Last month's level, drawn as the grey comparison line. */
  compare?: number;
  /** A share drawn as a meter, when there is no history. */
  meter?: { part: number; whole: number };
  /** One short line under the label (issues: Fix's own words). */
  sub?: string;
  href?: string;
}

/**
 * What Fix counts before sign-off, read from the shared figures():
 * what stops pay is every bank problem still in the data (an IBAN that
 * passes takes it out); what to check is every other problem not yet
 * marked reviewed. Home, Fix and the dashboards say the same numbers.
 */
export interface BeforeApproval {
  stops: number;
  checks: number;
}

export function beforeApproval(d: DemoData, s: DemoState): BeforeApproval {
  const fig = figures(d, s);
  return { stops: fig.blocking, checks: fig.toReview };
}

const short = (m: MonthRow): string => m.label.slice(0, 3);
const leaveDays = (m: MonthRow): number =>
  m.annualDays + m.sickDays + m.unpaidDays;

/** This month and last month from the history (October, September). */
export function lastTwo(src: ReportsSource): [MonthRow, MonthRow] {
  return [src.months.at(-1)!, src.months.at(-2)!];
}

function moneyTile(id: string, label: string, now: Fils, before: Fils,
  against: string, series: bigint[]): TileModel {
  return { id, label, figure: { kind: "money", fils: now },
    change: { kind: "money", fils: fils(now - before), against },
    series: series.map(Number), compare: Number(before) };
}

function countTile(id: string, label: string, now: number, before: number,
  against: string, series: number[], unit?: string): TileModel {
  return { id, label, figure: { kind: "count", n: now },
    change: { kind: "count", n: now - before, against,
      ...(unit === undefined ? {} : { unit }) },
    series, compare: before };
}

/** Fix's own words for the counts: the unit after the figure, and
 * the line under it ("stop pay", "6 to check"). */
export type IssueWords = (b: BeforeApproval) => { unit: string;
  sub: string; calm: { unit: string; sub: string } };

function issuesTile(b: BeforeApproval, w: IssueWords): TileModel {
  const whole = b.stops + b.checks;
  const words = w(b);
  // Nothing stops pay: the figure is what is left to check, so the
  // big number and the line under it never disagree ("6 to check").
  const calm = b.stops === 0 && b.checks > 0;
  const { unit, sub } = calm ? words.calm : words;
  return { id: "before-approval", label: "Before sign-off",
    figure: { kind: "count", n: calm ? b.checks : b.stops, unit },
    change: null, sub,
    ...(calm ? {} : { meter: { part: b.stops, whole: Math.max(whole, 1) } }),
    href: "#/pay-run/fix" };
}

/** Executive: net and gross pay, people paid, what stops the run. */
export function execTiles(src: ReportsSource, d: DemoData, s: DemoState,
  words: IssueWords): TileModel[] {
  const [now, before] = lastTwo(src);
  const h = d.headline();
  const ms = src.months;
  return [
    moneyTile("net", `Net pay, ${short(now)}`, h.netTotalFils, before.net,
      short(before), ms.map((m) => m.net)),
    moneyTile("gross", `Gross pay, ${short(now)}`, h.grossTotalFils,
      before.gross, short(before), ms.map((m) => m.gross)),
    countTile("paid", "People paid", now.headcount, before.headcount,
      short(before), ms.map((m) => m.headcount)),
    issuesTile(beforeApproval(d, s), words),
  ];
}

/** HR: people paid, what stops the run, leave and overtime. */
export function hrTiles(src: ReportsSource, d: DemoData, s: DemoState,
  words: IssueWords): TileModel[] {
  const [now, before] = lastTwo(src);
  const ms = src.months;
  const hrs = (m: number): number => Math.round(m / 6) / 10;
  return [
    countTile("paid", "People paid", now.headcount, before.headcount,
      short(before), ms.map((m) => m.headcount)),
    issuesTile(beforeApproval(d, s), words),
    countTile("leave", `Leave days, ${short(now)}`, leaveDays(now),
      leaveDays(before), short(before), ms.map(leaveDays), "days"),
    countTile("overtime", `Overtime hours, ${short(now)}`,
      hrs(now.overtimeMinutes), hrs(before.overtimeMinutes),
      short(before), ms.map((m) => hrs(m.overtimeMinutes)), "hours"),
  ];
}

export { waitingCount };

/** Departments, largest cost first. */
export function byCost(d: DemoData): DepartmentRow[] {
  return [...d.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : a.costFils > b.costFils ? -1 : 0);
}

/** Departments, most people first. */
export function byPeople(d: DemoData): DepartmentRow[] {
  return [...d.departments()].sort((a, b) => b.headcount - a.headcount);
}

export interface Slice {
  label: string;
  count: number;
}

/** The largest groups, then everyone else as one slice. */
export function topSlices(rows: { name: string; count: number }[],
  keep: number): Slice[] {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, keep).map((r) => ({ label: r.name,
    count: r.count }));
  const rest = sorted.slice(keep).reduce((n, r) => n + r.count, 0);
  return rest === 0 ? head : [...head, { label: "Other", count: rest }];
}

export interface MonthBar {
  key: string;
  label: string;
  value: bigint;
  mark?: string;
  focus?: boolean;
}

/**
 * Gross pay a month for the trend chart: the last paid month and this
 * run are marked with a word ("Paid", and this run's state).
 */
export function trendBars(src: ReportsSource, runWord: string)
  : MonthBar[] {
  const n = src.months.length;
  return src.months.map((m, i) => ({ key: m.month, label: short(m),
    value: m.gross,
    ...(i === n - 1 ? { mark: runWord, focus: true }
      : i === n - 2 ? { mark: m.paid ? "Paid" : "Not paid" } : {}) }));
}
