import { daysInMonth, formatIsoDate } from "../dates";
import { EngineError } from "../errors";
import { intParam, type Typed } from "../gratuity-params";
import { checkPeriod } from "../payroll/validate";
import { DEADLINE_PACKS } from "../rules/deadlines-pack";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { Traced } from "../trace-types";

export interface WpsDeadline { dueDate: string; alertFrom: string }
export interface GpssaDeadline { payableFrom: string; lastDay: string }

interface NextMonth { y: number; m: number; first: string }

/** The month after (year, month); its 1st selects the pack. */
function nextMonth(year: number, month: number): NextMonth {
  checkPeriod(year, month);
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return { y, m, first: formatIsoDate({ y, m, d: 1 }) };
}

/** Day param of the next month: a whole number within that month. */
function dayOf(pack: RulePack, key: string, n: NextMonth):
  Typed<string> {
  const day = intParam(pack, key, undefined, 1);
  if (day.v > BigInt(daysInMonth(n.y, n.m))) {
    throw new EngineError("INVALID_PARAM",
      `param ${key} is past the end of the month`,
      { key, value: String(day.v) });
  }
  const d = Number(day.v);
  return { v: formatIsoDate({ y: n.y, m: n.m, d }), rule: day.rule };
}

function dateLine(t: TraceBuilder, id: string, label: string,
  period: string, day: Typed<string>): void {
  t.add({ id, label, formula: "day param of the month after the period",
    inputs: { period }, result: day.v, rules: [day.rule] });
}

const periodText = (year: number, month: number): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;

/** WPS salary due date and late-alert date for a pay period. */
export function wpsDeadline(year: number, month: number,
  packs: readonly RulePack[] = DEADLINE_PACKS): Traced<WpsDeadline> {
  const n = nextMonth(year, month);
  const pack = selectPack(packs, n.first);
  const due = dayOf(pack, "wpsDueDayOfNextMonth", n);
  const alert = dayOf(pack, "wpsLateAlertDayOfNextMonth", n);
  const t = new TraceBuilder();
  const period = periodText(year, month);
  dateLine(t, "deadline.wps.due", "WPS salary due date", period, due);
  dateLine(t, "deadline.wps.alert",
    "Late alert date (no payment recorded)", period, alert);
  return { value: { dueDate: due.v, alertFrom: alert.v },
    trace: t.lines() };
}

/** GPSSA contribution window for a contribution month. */
export function gpssaDeadline(year: number, month: number,
  packs: readonly RulePack[] = DEADLINE_PACKS): Traced<GpssaDeadline> {
  const n = nextMonth(year, month);
  const pack = selectPack(packs, n.first);
  const from = dayOf(pack, "gpssaPayableFromDayOfNextMonth", n);
  const last = dayOf(pack, "gpssaLastDayOfNextMonth", n);
  const t = new TraceBuilder();
  const period = periodText(year, month);
  dateLine(t, "deadline.gpssa.first-day",
    "GPSSA contributions first payable day", period, from);
  dateLine(t, "deadline.gpssa.last-day",
    "GPSSA contributions last day", period, last);
  return { value: { payableFrom: from.v, lastDay: last.v },
    trace: t.lines() };
}
