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

export interface SourcedRule extends TraceRule {
  /** "<packId>@<version>:<key>", the rule's stable id. */
  ruleId: string;
  source: RuleSource | null;
}

export interface ExplainedLine {
  payslipId: string;
  line: TraceLine;
  inputs: Record<string, string>;
  rules: SourcedRule[];
  /** How the figure was reached, in order, plain text. */
  steps: string[];
  text: { en: string; ar: string; arReviewed: false };
  rulesScope: string;
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

function stepsOf(line: TraceLine, rules: SourcedRule[]): string[] {
  return [`Formula: ${line.formula}`,
    ...Object.entries(line.inputs).map(([k, v]) => `Input ${k} = ${v}`),
    ...rules.map((r) => `Rule ${r.ruleId} = ${r.value} (${r.overridden
      ? "overridden" : r.status}${r.source === null ? ""
      : `, ${r.source.note}`})`),
    `Result: ${line.result}`];
}

export function explainLine(c: DemoCompany, payslipId: string,
  line: TraceLine): ExplainedLine {
  const rules = line.rules.map((r) => ({ ...r,
    ruleId: `${r.packId}@${r.packVersion}:${r.key}`, source: sourceOf(r) }));
  return { payslipId, line, inputs: { ...line.inputs }, rules,
    steps: stepsOf(line, rules),
    text: { en: explainTrace([line], "en"), ar: explainTrace([line], "ar"),
      arReviewed: false }, rulesScope: c.rulesScope };
}

/** The trace line behind one payslip line (its traceId), explained. */
export function explainPayslipLine(c: DemoCompany, payslipId: string,
  traceId: string): ExplainedLine {
  const s = findPayslip(c, payslipId);
  const line = s.trace.find((l) => l.id === traceId);
  if (line === undefined) {
    throw new Error(`payslip ${payslipId} has no trace line ${traceId}`);
  }
  return explainLine(c, payslipId, line);
}

/** Every trace line of a payslip, explained in order. */
export function explainPayslip(c: DemoCompany, payslipId: string)
  : ExplainedLine[] {
  return findPayslip(c, payslipId).trace.map((l) =>
    explainLine(c, payslipId, l));
}
