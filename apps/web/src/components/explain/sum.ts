import { fils } from "@payroll/engine";
import {
  count,
  money,
  type ExplainInput,
  type ExplainRule,
  type ExplainStep,
  type ExplainValue,
  type Explanation,
} from "./types";

/**
 * Builders for figures that are a sum of parts (a report total, a
 * department, a count of people). The total is worked out here from
 * the parts, so the working always adds up; the tests then hold it to
 * the figure the screen shows. Imported only by the lazy data chunks.
 */

/** Our own working rule for every total: whole fils, no rounding. */
export const SUM_RULE: ExplainRule = {
  text: "A total adds each part as it was worked out, in whole fils. " +
    "Nothing is rounded at the total.",
  status: "convention", statusLabel: null,
  citation: "Our own working, as we apply it",
};

/** Our own working rule for a count of people or items. */
export const COUNT_RULE: ExplainRule = {
  text: "Each person or item is counted once, on the demo date.",
  status: "convention", statusLabel: null,
  citation: "Our own working, as we apply it",
};

export interface Part {
  text: string;
  /** Fils, or a count with its words. */
  value: ExplainValue;
  /** Taken away rather than added. */
  less?: boolean;
}

export interface SumSpec {
  id: string;
  title: string;
  subject: string;
  summary: string;
  resultLabel: string;
  parts: Part[];
  /** Words for the total line; the result label when left out. */
  totalText?: string;
  inputs?: ExplainInput[];
  rules?: ExplainRule[];
  /** Steps after the total (a second sum, or words only). */
  after?: ExplainStep[];
  notComputed?: string[];
  scope: string;
  /** The one line shown when there is nothing to add. */
  emptyText?: string;
  /** How a count total reads ("31 people"); counts only. */
  countText?: (n: number) => string;
}

/** The parts' total, as a money or count value. */
export function totalOf(parts: Part[], countText?: (n: number) => string)
  : ExplainValue {
  const isCount = parts.some((p) => p.value.kind === "count");
  if (isCount) {
    const n = parts.reduce((a, p) => a + (p.value.kind === "count"
      ? (p.less === true ? -p.value.n : p.value.n) : 0), 0);
    return count(n, countText?.(n) ?? String(n));
  }
  return money(fils(parts.reduce((a, p) => a + (p.value.kind === "money"
    ? (p.less === true ? -p.value.fils : p.value.fils) : 0n), 0n)));
}

/** The steps of a sum: each part, then the total. */
export function sumSteps(parts: Part[], totalText: string,
  countText?: (n: number) => string): ExplainStep[] {
  return [...parts.map((p): ExplainStep => ({ text: p.text, value: p.value,
    op: p.less === true ? "less" : "add" })),
  { text: totalText, value: totalOf(parts, countText), op: "total" }];
}

/** An explanation whose working is the parts adding up to the figure. */
export function sumExplain(spec: SumSpec): Explanation {
  // Nothing to add still shows as a working: "None", then 0.
  const s = spec.parts.length > 0 ? spec : { ...spec, parts: [{
    text: spec.emptyText ?? "None on the demo date",
    value: spec.countText !== undefined ? count(0, spec.countText(0))
      : money(fils(0n)) }] };
  const total = totalOf(s.parts, s.countText);
  const isCount = total.kind === "count";
  return { id: s.id, title: s.title, subject: s.subject,
    summary: s.summary,
    result: { label: s.resultLabel, value: total },
    inputs: s.inputs ?? [],
    rules: s.rules ?? [isCount ? COUNT_RULE : SUM_RULE],
    steps: [...sumSteps(s.parts, s.totalText ?? s.resultLabel,
      s.countText), ...(s.after ?? [])],
    notComputed: s.notComputed ?? [], scope: s.scope };
}

/** "1 person" or "3 people". */
export const people = (n: number): string =>
  `${n} ${n === 1 ? "person" : "people"}`;

/** A part worth one, for a list of people or items being counted. */
export const one = (label: string, words = "1"): Part =>
  ({ text: label, value: count(1, words) });
