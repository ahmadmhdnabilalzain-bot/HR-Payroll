import { mulDiv, type Fils } from "../money";
import type { TraceBuilder } from "../trace";
import type { DayAccount } from "./days";
import type { PayrollParams } from "./params";
import type { EarningKind, PayslipInput, PayslipLine } from "./types";

interface Component { traceId: string; kind: EarningKind; label: string;
  monthly: Fils; code: string }

function components(input: PayslipInput): Component[] {
  const e = input.employee;
  return [
    { traceId: "earn.basic", kind: "basic", label: "Basic salary",
      monthly: e.basicMonthly, code: "basic" },
    ...e.allowances.map((a): Component => ({
      traceId: `earn.allowance#${a.code}`, kind: a.kind,
      label: `Allowance ${a.code}`, monthly: a.monthly, code: a.code })),
  ];
}

/**
 * Basic and each allowance: monthly * paidHalfDays / totalHalfDays,
 * rounded once per line (calendar-day proration).
 */
export function fixedEarnings(input: PayslipInput, d: DayAccount,
  p: PayrollParams, t: TraceBuilder): PayslipLine<EarningKind>[] {
  const mode = p.roundingMode.v;
  return components(input).map((c) => {
    const amount = mulDiv(c.monthly, d.paidHalfDays, d.totalHalfDays,
      mode);
    t.add({ id: c.traceId, label: c.label,
      formula: "monthly * paidHalfDays / totalHalfDays, rounded once",
      inputs: { code: c.code, kind: c.kind, monthly: String(c.monthly),
        paidHalfDays: String(d.paidHalfDays),
        totalHalfDays: String(d.totalHalfDays), roundingMode: mode },
      result: String(amount),
      rules: [p.prorationBasis.rule, p.paidLeaveBase.rule,
        p.roundingMode.rule] });
    return { traceId: c.traceId, kind: c.kind, label: c.label, amount };
  });
}
