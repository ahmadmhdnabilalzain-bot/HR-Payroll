import {
  explainTrace,
  GPSSA_PACKS,
  GRATUITY_PACKS,
  PAYROLL_PACKS,
  type RuleSource,
  type TraceLine,
  type TraceRule,
} from "@payroll/engine";
import type { DemoCompany, DemoPayslip } from "./types";

const PACKS = [...PAYROLL_PACKS, ...GPSSA_PACKS, ...GRATUITY_PACKS];

export interface SourcedRule extends TraceRule { source: RuleSource | null }

export interface ExplainedLine {
  payslipId: string;
  line: TraceLine;
  text: { en: string; ar: string; arReviewed: false };
  rules: SourcedRule[];
}

/** The pack's source for a rule (TraceRule carries only ids). */
export function sourceOf(rule: TraceRule): RuleSource | null {
  const pack = PACKS.find((p) => p.id === rule.packId &&
    p.version === rule.packVersion);
  return pack?.params[rule.key]?.source ?? null;
}

export function findPayslip(c: DemoCompany, payslipId: string)
  : DemoPayslip {
  const s = c.payRun.payslips.find((p) => p.id === payslipId);
  if (s === undefined) throw new Error(`no payslip ${payslipId}`);
  return s;
}

export function explainLine(payslipId: string, line: TraceLine)
  : ExplainedLine {
  return { payslipId, line,
    text: { en: explainTrace([line], "en"), ar: explainTrace([line], "ar"),
      arReviewed: false },
    rules: line.rules.map((r) => ({ ...r, source: sourceOf(r) })) };
}

/** The trace line behind one payslip line (its traceId), explained. */
export function explainPayslipLine(c: DemoCompany, payslipId: string,
  traceId: string): ExplainedLine {
  const s = findPayslip(c, payslipId);
  const line = s.trace.find((l) => l.id === traceId);
  if (line === undefined) {
    throw new Error(`payslip ${payslipId} has no trace line ${traceId}`);
  }
  return explainLine(payslipId, line);
}

/** Every trace line of a payslip, explained in order. */
export function explainPayslip(c: DemoCompany, payslipId: string)
  : ExplainedLine[] {
  return findPayslip(c, payslipId).trace.map((l) =>
    explainLine(payslipId, l));
}
