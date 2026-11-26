import { isValidIsoDate, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import { fils, type Fils } from "../money";
import { EINVOICING_PACKS } from "../rules/einvoicing-pack";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import type { TraceRule, Traced } from "../trace-types";
import { addBusinessDays, addMonthsClamped, parseWeekend } from "./calendar";
import { dateParam, intParam, strParam } from "./params";

export type RevenueBand = "large" | "small" | "unknown";

export interface EinvoicingDeadlines {
  band: RevenueBand;
  appointBy: string | null;
  goLive: string | null;
}

/** Revenue of the last accounting period, as entered (Ruling 21). */
export function einvoicingDeadlines(
  revenue: Fils | null,
  asOf: string,
  packs: readonly RulePack[] = EINVOICING_PACKS,
): Traced<EinvoicingDeadlines> {
  const pack = selectPack(packs, asOf);
  if (revenue !== null && revenue < 0n) {
    throw new EngineError("INVALID_AMOUNT", "revenue must be 0 or more",
      { value: revenue.toString() });
  }
  const threshold = intParam(pack, "largeRevenueThresholdFils",
    undefined, 0);
  let value: EinvoicingDeadlines = { band: "unknown", appointBy: null,
    goLive: null };
  const rules = [threshold.rule];
  if (revenue !== null) {
    const band = revenue >= threshold.v ? "large" : "small";
    const appoint = dateParam(pack, `${band}AppointBy`);
    const live = dateParam(pack, `${band}GoLive`);
    rules.push(appoint.rule, live.rule);
    value = { band, appointBy: appoint.v, goLive: live.v };
  }
  return { value, trace: [{ id: "einv.deadlines",
    label: "E-invoicing deadlines",
    formula: "large when revenue >= largeRevenueThresholdFils, else " +
      "small; unknown when revenue is not entered",
    inputs: { revenue: String(revenue), asOf },
    result: value.band, rules }] };
}

function checkDates(dates: Record<string, string>): void {
  for (const [field, value] of Object.entries(dates)) {
    parseIsoDate(value, field);
  }
}

const MAX_MONTHS = 1200;

/** "Each month or part thereof" after the appointment deadline. */
function monthsLate(appointBy: string, end: string): number {
  if (end <= appointBy) return 0;
  for (let k = 1; k <= MAX_MONTHS; k += 1) {
    if (addMonthsClamped(appointBy, k) >= end) return k;
  }
  throw new EngineError("RANGE_TOO_LONG", "delay too long to count",
    { appointBy, end });
}

/** Fine exposure (an estimate) for a late provider appointment. */
export function appointmentFineExposure(
  appointBy: string,
  appointedOn: string | null,
  asOf: string,
  packs: readonly RulePack[] = EINVOICING_PACKS,
): Traced<{ monthsLate: number; amount: Fils }> {
  checkDates({ appointBy, asOf, ...(appointedOn === null ? {}
    : { appointedOn }) });
  if (appointedOn !== null && appointedOn > asOf) {
    throw new EngineError("INVALID_PERIOD",
      "appointedOn must not be after asOf", { appointedOn, asOf });
  }
  const pack = selectPack(packs, asOf);
  const fine = intParam(pack, "notImplementedFinePerMonthFils",
    undefined, 0);
  const months = monthsLate(appointBy, appointedOn ?? asOf);
  const amount = fils(BigInt(months) * fine.v);
  return { value: { monthsLate: months, amount }, trace: [{
    id: "einv.fine.appointment", label: "Late appointment fine exposure",
    formula: "months or part months after appointBy until the " +
      "appointment (or asOf) x notImplementedFinePerMonthFils",
    inputs: { appointBy, appointedOn: String(appointedOn), asOf },
    result: amount.toString(), rules: [fine.rule] }] };
}

export interface MonthCount {
  month: string;
  invoices: number;
  creditNotes: number;
}

function checkCounts(counts: readonly MonthCount[]): void {
  const seen = new Set<string>();
  for (const c of counts) {
    if (!/^\d{4}-\d{2}$/.test(c.month) || !isValidIsoDate(`${c.month}-01`)) {
      throw new EngineError("INVALID_DATE", "month must be YYYY-MM",
        { value: c.month });
    }
    if (seen.has(c.month)) {
      throw new EngineError("INVALID_PERIOD", "duplicate month",
        { month: c.month });
    }
    seen.add(c.month);
    for (const n of [c.invoices, c.creditNotes]) {
      if (!Number.isSafeInteger(n) || n < 0) {
        throw new EngineError("INVALID_COUNT", "counts must be whole " +
          "numbers of at least 0", { month: c.month, value: String(n) });
      }
    }
  }
}

function capped(count: number, each: bigint, cap: bigint): bigint {
  const total = BigInt(count) * each;
  return total < cap ? total : cap;
}

function monthFine(pack: RulePack, c: MonthCount) {
  const keys = ["missingInvoiceFineFils", "missingInvoiceMonthlyCapFils",
    "missingCreditNoteFineFils", "missingCreditNoteMonthlyCapFils"];
  const [inv, invCap, cn, cnCap] = keys.map((k) =>
    intParam(pack, k, undefined, 0));
  const amount = capped(c.invoices, inv!.v, invCap!.v) +
    capped(c.creditNotes, cn!.v, cnCap!.v);
  return { amount: fils(amount), rules: [inv!, invCap!, cn!, cnCap!]
    .map((p) => p.rule) };
}

/** Per month, each capped; the pack is selected on the month's day 1. */
export function missingDocumentFineExposure(
  counts: MonthCount[],
  packs: readonly RulePack[] = EINVOICING_PACKS,
): Traced<{ amount: Fils; byMonth: { month: string; amount: Fils }[] }> {
  checkCounts(counts);
  const rules = new Map<string, TraceRule>();
  const byMonth = counts.map((c) => {
    const r = monthFine(selectPack(packs, `${c.month}-01`), c);
    for (const rule of r.rules) {
      rules.set(`${rule.key}@${rule.packVersion}`, rule);
    }
    return { month: c.month, amount: r.amount };
  });
  const amount = fils(byMonth.reduce((s, m) => s + m.amount, 0n));
  return { value: { amount, byMonth }, trace: [{
    id: "einv.fine.missing", label: "Missing e-invoice fine exposure",
    formula: "per month min(invoices x fine, cap) + min(credit notes " +
      "x fine, cap)",
    inputs: { months: String(counts.length) }, result: amount.toString(),
    rules: [...rules.values()] }] };
}

/** Last day to issue and transmit: n business days after the deal. */
export function einvoiceIssueBy(
  transactionDate: string,
  holidays: readonly string[],
  packs: readonly RulePack[] = EINVOICING_PACKS,
): Traced<string> {
  const pack = selectPack(packs, transactionDate);
  const window = intParam(pack, "issueWindowBusinessDays", undefined, 0);
  const weekend = strParam(pack, "weekendDays");
  const by = addBusinessDays(transactionDate, Number(window.v),
    parseWeekend(weekend.v), holidays);
  return { value: by, trace: [{ id: "einv.issue-by",
    label: "Issue and transmit by",
    formula: "transaction date + issueWindowBusinessDays business days",
    inputs: { transactionDate, holidays: holidays.join(",") },
    result: by, rules: [window.rule, weekend.rule] }] };
}

/** The one open-ended pack: TIN rules carry no date of their own. */
function currentPack(packs: readonly RulePack[]): RulePack {
  const open = packs.filter((p) => p.effectiveTo === null);
  if (open.length !== 1) {
    throw new EngineError(open.length === 0 ? "NO_PACK_FOR_DATE"
      : "OVERLAPPING_PACKS", "exactly one open-ended e-invoicing pack " +
      "is needed", { count: String(open.length) });
  }
  return open[0]!;
}

/**
 * TRN shape: 15 digits, no check digit. An ASSUMPTION (Plan 12 Ruling
 * 9, Plan 6 Ruling 5), not a sourced rule; product convention.
 */
const TRN_SHAPE = /^\d{15}$/;

/** TIN = the first tinDigits digits of the TRN (MoF glossary). */
export function tinFromTrn(
  trn: string,
  packs: readonly RulePack[] = EINVOICING_PACKS,
): string {
  const digits = Number(intParam(currentPack(packs), "tinDigits",
    undefined, 1).v);
  if (!TRN_SHAPE.test(trn) || trn.length < digits) {
    throw new EngineError("INVALID_TRN",
      "TRN must be 15 digits (assumed shape)", { value: trn });
  }
  return trn.slice(0, digits);
}

/** Scheme and id kept apart: no separator is guessed. */
export function participantIdFor(
  trn: string,
  packs: readonly RulePack[] = EINVOICING_PACKS,
): { scheme: string; id: string } {
  const scheme = strParam(currentPack(packs), "participantScheme").v;
  return { scheme, id: tinFromTrn(trn, packs) };
}
