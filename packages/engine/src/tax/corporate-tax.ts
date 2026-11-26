import { addDays, isValidIsoDate } from "../dates";
import { EngineError } from "../errors";
import { fils, mulDiv, type Fils } from "../money";
import { CT_PACKS } from "../rules/ct-pack";
import { selectPack } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { TraceRule, Traced } from "../trace-types";
import { addMonthsClamped } from "./calendar";
import { dateParam, intParam, modeParam } from "./params";

export interface CtAdjustment {
  label: string;
  amount: Fils;
  effect: "add" | "deduct";
}

export interface CtInput {
  periodStart: string;
  periodEnd: string;
  /** Signed: a loss is negative. */
  accountingProfit: Fils;
  adjustments: CtAdjustment[];
  revenue: Fils;
  sbr: {
    elected: boolean;
    revenueWithinThresholdInPriorPeriods: boolean | null;
    qualifyingFreeZoneOrMneMember: boolean | null;
  };
  overrides?: Record<string, ParamValue>;
}

export type SbrStatus =
  | "not-elected"
  | "conditions-met"
  | "condition-not-met"
  | "not-assessed";

export interface CtResult {
  taxableIncome: Fils;
  periodLoss: Fils;
  zeroBandPortion: Fils;
  mainBandPortion: Fils;
  taxBeforeRelief: Fils;
  sbr: { status: SbrStatus; reasons: string[] };
  taxAfterRelief: Fils | null;
  dueDate: string;
  notComputed: string[];
}

type Ov = Record<string, ParamValue> | undefined;

const MAX_PERIOD_MONTHS = 18;

const NOT_COMPUTED = ["tax loss relief and carry-forward",
  "qualifying free zone person rates", "tax group consolidation",
  "late filing and payment penalties"];

function checkInput(input: CtInput): void {
  const { periodStart: s, periodEnd: e } = input;
  const ok = isValidIsoDate(s) && isValidIsoDate(e) && s < e &&
    e <= addDays(addMonthsClamped(s, MAX_PERIOD_MONTHS), -1);
  if (!ok) {
    throw new EngineError("INVALID_PERIOD", "periodEnd must be after " +
      `periodStart and the period at most ${MAX_PERIOD_MONTHS} months`,
      { periodStart: s, periodEnd: e });
  }
  const amounts = [input.revenue, ...input.adjustments.map((a) =>
    a.amount)];
  if (amounts.some((a) => a < 0n)) {
    throw new EngineError("INVALID_AMOUNT",
      "revenue and adjustment amounts must be 0 or more",
      { values: amounts.join(",") });
  }
}

function preTax(input: CtInput): bigint {
  return input.adjustments.reduce((sum, a) =>
    (a.effect === "add" ? sum + a.amount : sum - a.amount),
  input.accountingProfit as bigint);
}

interface Bands {
  zero: Fils;
  main: Fils;
  tax: Fils;
}

function bandTax(pack: RulePack, ov: Ov, taxable: bigint,
  t: TraceBuilder): Bands {
  const upper = intParam(pack, "zeroBandUpperFils", ov, 0);
  const zeroRate = intParam(pack, "zeroBandRateBps", ov, 0);
  const mainRate = intParam(pack, "mainRateBps", ov, 0);
  const mode = modeParam(pack, "taxRounding", ov);
  const zero = fils(taxable < upper.v ? taxable : upper.v);
  const main = fils(taxable - zero);
  const zeroTax = mulDiv(zero, zeroRate.v, 10000n, mode.v);
  const mainTax = mulDiv(main, mainRate.v, 10000n, mode.v);
  t.add({ id: "ct.zero-band", label: "Zero band",
    formula: "min(taxable income, zeroBandUpperFils) x zeroBandRateBps",
    inputs: { taxableIncome: taxable.toString() },
    result: zeroTax.toString(),
    rules: [upper.rule, zeroRate.rule, mode.rule] });
  t.add({ id: "ct.main-band", label: "Main band",
    formula: "taxable income above the zero band x mainRateBps",
    inputs: { mainBandPortion: main.toString() },
    result: mainTax.toString(), rules: [mainRate.rule, mode.rule] });
  return { zero, main, tax: fils(zeroTax + mainTax) };
}

interface Sbr {
  status: SbrStatus;
  reasons: string[];
  rules: TraceRule[];
}

function notMetReasons(input: CtInput, threshold: bigint): string[] {
  const out: string[] = [];
  if (input.revenue > threshold) out.push("REVENUE_OVER_THRESHOLD");
  if (input.sbr.revenueWithinThresholdInPriorPeriods === false) {
    out.push("PRIOR_PERIOD_REVENUE_OVER_THRESHOLD");
  }
  if (input.sbr.qualifyingFreeZoneOrMneMember === true) {
    out.push("QUALIFYING_FREE_ZONE_OR_MNE_MEMBER");
  }
  return out;
}

function unknownReasons(input: CtInput): string[] {
  const out: string[] = [];
  if (input.sbr.revenueWithinThresholdInPriorPeriods === null) {
    out.push("PRIOR_PERIODS_NOT_ENTERED");
  }
  if (input.sbr.qualifyingFreeZoneOrMneMember === null) {
    out.push("FREE_ZONE_OR_MNE_NOT_ENTERED");
  }
  return out;
}

/** The relief's last period end, or null while it is unsourced. */
function lastPeriodEnd(pack: RulePack, ov: Ov) {
  try {
    const p = dateParam(pack, "sbrLastPeriodEnd", ov);
    return { v: p.v as string | null, rule: p.rule };
  } catch (e) {
    if (!(e instanceof EngineError) || e.code !== "UNSOURCED_PARAM") {
      throw e;
    }
    const rule: TraceRule = { key: "sbrLastPeriodEnd", value: "null",
      status: "unsourced", packId: pack.id, packVersion: pack.version,
      overridden: false };
    return { v: null, rule };
  }
}

function assessSbr(pack: RulePack, input: CtInput): Sbr {
  const ov = input.overrides;
  const threshold = intParam(pack, "sbrRevenueThresholdFils", ov, 0);
  if (!input.sbr.elected) {
    return { status: "not-elected", reasons: [], rules: [threshold.rule] };
  }
  const end = lastPeriodEnd(pack, ov);
  const rules = [threshold.rule, end.rule];
  const notMet = notMetReasons(input, threshold.v);
  if (notMet.length > 0) {
    return { status: "condition-not-met", reasons: notMet, rules };
  }
  const unknown = unknownReasons(input);
  if (end.v === null) unknown.push("SBR_END_DATE_UNSOURCED");
  if (unknown.length > 0) {
    return { status: "not-assessed", reasons: unknown, rules };
  }
  if (end.v! < input.periodEnd) {
    return { status: "condition-not-met",
      reasons: ["PERIOD_AFTER_SBR_LAST_PERIOD"], rules };
  }
  return { status: "conditions-met", reasons: [], rules };
}

function afterRelief(sbr: Sbr, before: Fils): Fils | null {
  if (sbr.status === "conditions-met") return fils(0n);
  return sbr.status === "not-assessed" ? null : before;
}

function addSbrLine(t: TraceBuilder, sbr: Sbr, after: Fils | null) {
  t.add({ id: "ct.sbr", label: "Small business relief",
    formula: "not elected; or condition not met; or not assessed when " +
      "an attestation or the last period end is missing; else treated " +
      "as not having derived any taxable income",
    inputs: { reasons: sbr.reasons.join(",") },
    result: `${sbr.status}; tax after relief ${String(after)}`,
    rules: sbr.rules });
}

function dueDateOf(pack: RulePack, input: CtInput, t: TraceBuilder) {
  const months = intParam(pack, "returnDueMonthsAfterPeriodEnd",
    input.overrides, 0);
  const due = addMonthsClamped(input.periodEnd, Number(months.v));
  t.add({ id: "ct.due-date", label: "Return and payment due",
    formula: "period end + returnDueMonthsAfterPeriodEnd months",
    inputs: { periodEnd: input.periodEnd }, result: due,
    rules: [months.rule] });
  return due;
}

/**
 * Corporate tax worksheet from company-entered accounting profit and
 * adjustments (Ruling 19). Losses are shown, not carried.
 */
export function computeCorporateTax(
  input: CtInput,
  packs: readonly RulePack[] = CT_PACKS,
): Traced<CtResult> {
  checkInput(input);
  const pack = selectPack(packs, input.periodEnd);
  const t = new TraceBuilder();
  const pre = preTax(input);
  const taxable = fils(pre > 0n ? pre : 0n);
  t.add({ id: "ct.taxable-income", label: "Taxable income",
    formula: "max(accounting profit + adds - deducts, 0)",
    inputs: { accountingProfit: input.accountingProfit.toString(),
      adjustments: String(input.adjustments.length) },
    result: taxable.toString(), rules: [] });
  const bands = bandTax(pack, input.overrides, taxable, t);
  const sbr = assessSbr(pack, input);
  const after = afterRelief(sbr, bands.tax);
  addSbrLine(t, sbr, after);
  const value: CtResult = { taxableIncome: taxable,
    periodLoss: fils(pre < 0n ? -pre : 0n), zeroBandPortion: bands.zero,
    mainBandPortion: bands.main, taxBeforeRelief: bands.tax,
    sbr: { status: sbr.status, reasons: sbr.reasons },
    taxAfterRelief: after, dueDate: dueDateOf(pack, input, t),
    notComputed: [...NOT_COMPUTED] };
  return { value, trace: t.lines() };
}
