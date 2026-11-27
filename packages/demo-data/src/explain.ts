import {
  explainTrace,
  GPSSA_PACKS,
  GRATUITY_PACKS,
  PAYROLL_PACKS,
  STATUS_WORDS,
  type RuleSource,
  type TraceLine,
  type TraceRule,
} from "@payroll/engine";
import { PENSION_LINE_ID, PENSION_NOT_COMPUTED } from "./pension";
import type { DemoCompany, DemoPayslip } from "./types";

const PACKS = [...PAYROLL_PACKS, ...GPSSA_PACKS, ...GRATUITY_PACKS];

export interface SourcedRule extends TraceRule {
  /** "<packId>@<version>:<key>", the rule's stable id. */
  ruleId: string;
  source: RuleSource | null;
  /** The status the demo shows (may differ from the pack's label). */
  presentedStatus: string;
  /** The demo's own words for that status, or null. */
  presentedLabel: string | null;
}

type Lang = "en" | "ar";

/**
 * Where the demo shows a different status from the engine pack's
 * label (a ruling; the engine is not changed). None now: the 50%
 * overall deduction limit is in Art 25(2) itself, so the explain
 * panel shows the pack's "official", as the rules screen does.
 */
export const PRESENTED_STATUS: Record<string, { status: string;
  label: Record<Lang, string> }> = {};

const presentedOf = (r: TraceRule) =>
  r.overridden ? undefined : PRESENTED_STATUS[`${r.packId}:${r.key}`];

function sourced(r: TraceRule): SourcedRule {
  const p = presentedOf(r);
  return { ...r, ruleId: `${r.packId}@${r.packVersion}:${r.key}`,
    source: sourceOf(r),
    presentedStatus: p?.status ?? (r.overridden ? "overridden" : r.status),
    presentedLabel: p?.label.en ?? null };
}

/** The status list the demo shows, in the engine's own order. */
function statusText(rules: TraceRule[], lang: Lang): string {
  const words = rules.map((r) => presentedOf(r)?.label[lang] ??
    STATUS_WORDS[lang][r.overridden ? "overridden" : r.status] ?? r.status);
  return [...new Set(words)].join(", ");
}

/** The engine's sentence, its closing status list in our words. */
function presentedText(line: TraceLine, lang: Lang): string {
  const text = explainTrace([line], lang);
  if (!line.rules.some((r) => presentedOf(r) !== undefined)) return text;
  return text.replace(/\(([^()]*)\)\.$/, `(${statusText(line.rules,
    lang)}).`);
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
    ...rules.map((r) => `Rule ${r.ruleId} = ${r.value} (` +
      `${r.presentedLabel ?? r.presentedStatus}${r.source === null ? ""
        : `, ${r.source.note}`})`),
    `Result: ${line.result}`];
}

export function explainLine(c: DemoCompany, payslipId: string,
  line: TraceLine): ExplainedLine {
  const rules = line.rules.map(sourced);
  return { payslipId, line, inputs: { ...line.inputs }, rules,
    steps: stepsOf(line, rules), text: textOf(line),
    rulesScope: c.rulesScope };
}

/** The engine's catalog, except the demo's own pension line. */
function textOf(line: TraceLine): ExplainedLine["text"] {
  if (line.id === PENSION_LINE_ID) {
    return { en: PENSION_NOT_COMPUTED.en, ar: PENSION_NOT_COMPUTED.ar,
      arReviewed: false };
  }
  return { en: presentedText(line, "en"), ar: presentedText(line, "ar"),
    arReviewed: false };
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
