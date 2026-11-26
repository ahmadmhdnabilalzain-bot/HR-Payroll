import { EngineError } from "../errors";
import { fils, mulDiv, type Fils } from "../money";
import type { TraceBuilder } from "../trace";
import type { TraceRule } from "../trace-types";
import type { GpssaRegime, PayrollParams } from "./params";
import type {
  DeductionLineKind,
  DeductionRequest,
  DeferredDeduction,
  LoanBalance,
  LoanInstalment,
  PayslipFlag,
  PayslipLine,
} from "./types";

/** Where the GPSSA amount came from: this month's share plus arrears. */
export interface GpssaTrace { share: Fils; arrears: Fils;
  rules: TraceRule[]; regime: GpssaRegime }
export interface DeductionArgs { earnedWage: Fils;
  contractualWage: Fils; gpssaShare: Fils | null;
  requests: DeductionRequest[]; loans: LoanInstalment[];
  gpssaTrace?: GpssaTrace;
  /** The worker leaves this month: no later payslip will recover. */
  atExit?: boolean }
export interface DeductionResult {
  lines: PayslipLine<DeductionLineKind>[]; total: Fils;
  caps: { wageBase: Fils; overall: Fils };
  deferred: DeferredDeduction[]; loanBalances: LoanBalance[];
  flags: PayslipFlag[] }

const KINDS: readonly DeductionLineKind[] = ["gpssa", "court-debt",
  "overpayment", "violation", "damage", "scheme", "loan"];

const LABELS: Record<DeductionLineKind, string> = {
  gpssa: "Pension contribution, employee share",
  "court-debt": "Court-ordered deduction", overpayment:
    "Recovery of an overpayment", violation: "Deduction for a violation",
  damage: "Deduction for damage", scheme: "Deduction for a scheme",
  loan: "Loan repayment",
};

/** deductionOrder must name each of the seven kinds once. */
function parseOrder(p: PayrollParams): DeductionLineKind[] {
  const parts = p.deductionOrder.v.split(",").map((s) => s.trim());
  const ok = parts.length === KINDS.length &&
    KINDS.every((k) => parts.includes(k));
  if (!ok) {
    throw new EngineError("INVALID_PARAM", "param deductionOrder must " +
      `list each of ${KINDS.join(",")} once`,
      { key: "deductionOrder", value: p.deductionOrder.v });
  }
  return parts as DeductionLineKind[];
}

interface Cap { amount: Fils | null; rules: TraceRule[] }
type Caps = Record<DeductionLineKind, Cap>;

function kindCaps(a: DeductionArgs, p: PayrollParams): Caps {
  const m = p.capRoundingMode;
  const pct = (b: { v: bigint }) =>
    mulDiv(a.earnedWage, b.v, 10000n, m.v);
  const days = (d: { v: bigint }) =>
    mulDiv(a.contractualWage, d.v, p.dailyDivisor.v, m.v);
  const v5 = pct(p.violationCapBps);
  const vDays = days(p.violationCapDays);
  const none: Cap = { amount: null, rules: [] };
  return {
    gpssa: none, scheme: { amount: null,
      rules: [p.schemeConsentRequired.rule] },
    loan: { amount: null, rules: [p.loanConsentRequired.rule] },
    overpayment: { amount: pct(p.overpaymentCapBps),
      rules: [p.overpaymentCapBps.rule, m.rule] },
    "court-debt": { amount: pct(p.courtDebtCapBps),
      rules: [p.courtDebtCapBps.rule, m.rule] },
    violation: { amount: v5 < vDays ? v5 : vDays,
      rules: [p.violationCapBps.rule, p.violationCapDays.rule,
        p.violationCapRule.rule, p.dailyDivisor.rule, m.rule] },
    damage: { amount: days(p.damageCapDays),
      rules: [p.damageCapDays.rule, p.dailyDivisor.rule, m.rule] },
  };
}

interface Item { kind: DeductionLineKind; ref: string; requested: Fils;
  loan: LoanInstalment | null; inputs?: Record<string, string>;
  rules?: TraceRule[] }

function gpssaItem(a: DeductionArgs, share: Fils): Item {
  const g = a.gpssaTrace;
  const item: Item = { kind: "gpssa", ref: "gpssa", requested: share,
    loan: null };
  if (g === undefined) return item;
  return { ...item, rules: g.rules, inputs: { share: String(g.share),
    arrears: String(g.arrears), regime: g.regime } };
}

function itemsOf(kind: DeductionLineKind, a: DeductionArgs): Item[] {
  if (kind === "gpssa") {
    return a.gpssaShare === null ? [] : [gpssaItem(a, a.gpssaShare)];
  }
  if (kind === "loan") {
    return a.loans.map((l) => ({ kind, ref: l.ref, loan: l,
      requested: l.balance < l.instalment ? l.balance : l.instalment }));
  }
  return a.requests.filter((r) => r.kind === kind)
    .map((r) => ({ kind, ref: r.ref, requested: r.amount, loan: null }));
}

const min = (...xs: bigint[]): bigint =>
  xs.reduce((x, y) => (y < x ? y : x));

interface State { overallLeft: bigint; kindLeft: Map<string, bigint>;
  out: DeductionResult; args: DeductionArgs }

function traceId(i: Item): string {
  return i.kind === "gpssa" ? "ded.gpssa" : `ded.${i.kind}#${i.ref}`;
}

const LATER = { code: "DEDUCTION_DEFERRED", message: "part of this " +
  "deduction is deferred to a later month by the Article 25 caps" };
const AT_EXIT = { code: "DEDUCTION_DUE_AT_EXIT", message: "the Article " +
  "25 caps left part of this deduction unpaid and the worker leaves " +
  "this month: it must be settled at exit in the final settlement, " +
  "which this engine does not compute" };

/** The remit rule read for each regime; Law 7's clause is not read. */
const REMIT: Record<GpssaRegime, string> = {
  "dl57-2023": "the employer still remits the full employee share, " +
    "DL57 Art 11(4)",
  "law7-1999": "the employer still remits the full employee share " +
    "(Law 7 clause on remitting not read)",
};

function deferFlags(a: DeductionArgs, i: Item, d: DeferredDeduction):
  PayslipFlag[] {
  const detail = { ref: i.ref, kind: i.kind, deferred: String(d.deferred),
    reason: d.reason };
  const flags = [{ ...(a.atExit === true ? AT_EXIT : LATER), detail }];
  if (i.kind !== "gpssa") return flags;
  const regime = a.gpssaTrace?.regime ?? "dl57-2023";
  return [...flags, { code: "GPSSA_SHARE_DEFERRED",
    message: REMIT[regime], detail }];
}

function takeItem(s: State, i: Item, cap: Cap, p: PayrollParams,
  t: TraceBuilder): void {
  const kindLeft = s.kindLeft.get(i.kind);
  const overallLeft = s.overallLeft;
  const taken = fils(min(i.requested, kindLeft ?? i.requested,
    overallLeft));
  const rest = fils(i.requested - taken);
  s.overallLeft -= taken;
  if (kindLeft !== undefined) s.kindLeft.set(i.kind, kindLeft - taken);
  const id = traceId(i);
  const label = i.kind === "gpssa" ? LABELS.gpssa
    : `${LABELS[i.kind]} ${i.ref}`;
  s.out.lines.push({ traceId: id, kind: i.kind, label, amount: taken });
  if (rest > 0n) {
    // The kind cap bound when it, not the overall cap, set the amount.
    const kindBound = kindLeft !== undefined && kindLeft <= overallLeft;
    const d: DeferredDeduction = { ref: i.ref, kind: i.kind,
      requested: i.requested, taken, deferred: rest,
      reason: kindBound ? "kind-cap" : "overall-cap" };
    s.out.deferred.push(d);
    s.out.flags.push(...deferFlags(s.args, i, d));
  }
  traceItem(s, t, i, { id, label, taken, rest, cap, p });
}

interface Taken { id: string; label: string; taken: Fils; rest: Fils; cap: Cap;
  p: PayrollParams }

function traceItem(s: State, t: TraceBuilder, i: Item, k: Taken): void {
  const inputs: Record<string, string> = { ref: i.ref,
    requested: String(i.requested), kindCap: k.cap.amount === null
      ? "none" : String(k.cap.amount), taken: String(k.taken),
    deferred: String(k.rest), ...i.inputs };
  if (i.loan !== null) {
    const after = fils(i.loan.balance - k.taken);
    inputs["instalment"] = String(i.loan.instalment);
    inputs["balanceBefore"] = String(i.loan.balance);
    inputs["balanceAfter"] = String(after);
    s.out.loanBalances.push({ ref: i.ref, before: i.loan.balance, after });
  }
  t.add({ id: k.id, label: k.label,
    formula: "min(requested, what is left of the kind cap, what is " +
      "left of the overall cap)", inputs, result: String(k.taken),
    rules: [...k.cap.rules, k.p.deductionOverallCapBps.rule,
      k.p.deductionOrder.rule, ...(i.rules ?? [])] });
}

/** Basis points as a percent: 5000 -> "50%", 4050 -> "40.5%". */
function percent(bps: bigint): string {
  const frac = String(bps % 100n).padStart(2, "0").replace(/0+$/, "");
  return `${bps / 100n}${frac === "" ? "" : "." + frac}%`;
}

function traceCaps(a: DeductionArgs, overall: Fils, p: PayrollParams,
  t: TraceBuilder): void {
  t.add({ id: "cap.base", label: "Wage used for deduction limits",
    formula: "earned basic and allowances after proration",
    inputs: { earnedWage: String(a.earnedWage),
      contractualWage: String(a.contractualWage) },
    result: String(a.earnedWage), rules: [p.deductionCapBase.rule] });
  t.add({ id: "cap.overall", label: "Most that may be deducted",
    formula: "earnedWage * deductionOverallCapBps / 10000, rounded down",
    inputs: { earnedWage: String(a.earnedWage),
      capBps: String(p.deductionOverallCapBps.v),
      capPercent: percent(p.deductionOverallCapBps.v) },
    result: String(overall),
    rules: [p.deductionOverallCapBps.rule, p.capRoundingMode.rule] });
}

function violationFlag(a: DeductionArgs, caps: Caps,
  p: PayrollParams): PayslipFlag[] {
  if (!a.requests.some((r) => r.kind === "violation")) return [];
  const m = p.capRoundingMode.v;
  const five = mulDiv(a.earnedWage, p.violationCapBps.v, 10000n, m);
  const days = mulDiv(a.contractualWage, p.violationCapDays.v,
    p.dailyDivisor.v, m);
  return [{ code: "VIOLATION_CAP_CONFLICT", message: "Art 25(1)(f) caps " +
    "violation deductions at 5% of the wage, Art 39(1)(c) at five days' " +
    "wage; the stricter is used", detail: { fivePercent: String(five),
    fiveDays: String(days), used: String(caps.violation.amount) } }];
}

/** Article 25: kind caps, the 50% overall cap, a fixed order. */
export function applyDeductions(a: DeductionArgs, p: PayrollParams,
  t: TraceBuilder): DeductionResult {
  const order = parseOrder(p);
  const overall = mulDiv(a.earnedWage, p.deductionOverallCapBps.v, 10000n,
    p.capRoundingMode.v);
  traceCaps(a, overall, p, t);
  const caps = kindCaps(a, p);
  const kindLeft = new Map<string, bigint>();
  for (const k of KINDS) {
    const c = caps[k].amount;
    if (c !== null) kindLeft.set(k, c);
  }
  const s: State = { overallLeft: overall, kindLeft, out: { lines: [],
    total: fils(0n), caps: { wageBase: a.earnedWage, overall },
    deferred: [], loanBalances: [], flags: [] }, args: a };
  for (const kind of order) {
    for (const i of itemsOf(kind, a)) takeItem(s, i, caps[kind], p, t);
  }
  s.out.flags.push(...violationFlag(a, caps, p));
  const total = fils(overall - s.overallLeft);
  t.add({ id: "ded.total", label: "Total deductions",
    formula: "sum of the deduction lines", inputs: {
      lines: String(s.out.lines.length) }, result: String(total),
    rules: [] });
  return { ...s.out, total };
}
