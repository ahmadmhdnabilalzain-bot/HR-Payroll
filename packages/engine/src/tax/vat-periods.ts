import { addDays, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import { VAT_PACKS } from "../rules/vat-pack";
import type { Traced } from "../trace-types";
import {
  addMonthsClamped,
  parseWeekend,
  rollToBusinessDay,
} from "./calendar";
import { boolParam, intParam, strParam } from "./params";

export interface VatPeriod {
  start: string;
  end: string;
}

const MAX_PERIODS = 120;

function monthIndex(date: string): number {
  const { y, m } = parseIsoDate(date);
  return y * 12 + m - 1;
}

function checkPeriodArgs(first: string, months: number, from: string,
  to: string): void {
  if (parseIsoDate(first, "firstPeriodStart").d !== 1) {
    throw new EngineError("INVALID_DATE",
      "the first period must start on day 1 of a month",
      { field: "firstPeriodStart", value: first });
  }
  if (months !== 1 && months !== 3) {
    throw new EngineError("INVALID_PARAM",
      "period length must be 1 or 3 months",
      { key: "periodMonths", value: String(months) });
  }
  parseIsoDate(from, "range start");
  parseIsoDate(to, "range end");
  if (from > to) {
    throw new EngineError("INVALID_PERIOD", "from must not be after to",
      { from, to });
  }
}

/**
 * Back-to-back periods of 1 or 3 months from the company's own first
 * period start (Ruling 12); those overlapping [from, to], at most 120.
 */
export function vatPeriods(
  firstPeriodStart: string,
  periodMonths: 1 | 3,
  from: string,
  to: string,
): VatPeriod[] {
  checkPeriodArgs(firstPeriodStart, periodMonths, from, to);
  const base = monthIndex(firstPeriodStart);
  const firstK = Math.max(0,
    Math.floor((monthIndex(from) - base) / periodMonths));
  const lastK = Math.floor((monthIndex(to) - base) / periodMonths);
  if (lastK < firstK) return [];
  if (lastK - firstK + 1 > MAX_PERIODS) {
    throw new EngineError("RANGE_TOO_LONG",
      `at most ${MAX_PERIODS} periods per request`, { from, to });
  }
  const out: VatPeriod[] = [];
  for (let k = firstK; k <= lastK; k += 1) {
    const start = addMonthsClamped(firstPeriodStart, k * periodMonths);
    const next = addMonthsClamped(firstPeriodStart,
      (k + 1) * periodMonths);
    out.push({ start, end: addDays(next, -1) });
  }
  return out;
}

export interface VatReturnDue {
  dueDate: string;
  unrolledDate: string;
  rolled: boolean;
}

/** Period end + the pack's days, rolled past weekends and holidays. */
export function vatReturnDue(
  periodEnd: string,
  holidays: readonly string[],
  packs: readonly RulePack[] = VAT_PACKS,
): Traced<VatReturnDue> {
  const pack = selectPack(packs, periodEnd);
  const days = intParam(pack, "returnDueDaysAfterPeriodEnd", undefined,
    0);
  const rolls = boolParam(pack, "returnDueRollsToNextBusinessDay",
    undefined);
  const weekend = strParam(pack, "weekendDays");
  const unrolledDate = addDays(periodEnd, Number(days.v));
  const dueDate = rolls.v
    ? rollToBusinessDay(unrolledDate, parseWeekend(weekend.v), holidays)
    : unrolledDate;
  const value = { dueDate, unrolledDate, rolled: dueDate !== unrolledDate };
  return { value, trace: [{
    id: "vat.return.due",
    label: "VAT return due",
    formula: "period end + returnDueDaysAfterPeriodEnd, moved to the " +
      "next business day when it falls on a weekend day or holiday",
    inputs: { periodEnd, holidays: holidays.join(",") },
    result: dueDate,
    rules: [days.rule, rolls.rule, weekend.rule],
  }] };
}
