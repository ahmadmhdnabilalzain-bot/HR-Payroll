import type { Fils } from "@payroll/engine";

/**
 * The explain-why contract: plain data, no package types, so any
 * screen (pay run, people, reports) can hand a figure to the panel.
 * Text arrives already in the reader's language. Money stays in fils
 * and is drawn by <Money>, so "hide amounts" also hides it here.
 */

/** How sure the rule is: from the law, from a secondary source, our
 * own convention, or not sourced at all. Shown as a word and colour. */
export type SourceStatus = "official" | "secondary" | "convention" |
  "unsourced";

/** A count carries its number (so a working can be added up) and the
 * words it is shown in ("31 people", "22½ days"). */
export type ExplainValue =
  | { kind: "money"; fils: Fils }
  | { kind: "text"; text: string }
  | { kind: "count"; n: number; text: string };

/** One figure that went in, and where it came from. */
export interface ExplainInput {
  label: string;
  value: ExplainValue;
  /** Plain words: "Employee record", "October timesheet". */
  from: string;
}

/** One rule the working used. */
export interface ExplainRule {
  /** What the rule says, in a plain sentence. */
  text: string;
  status: SourceStatus;
  /** Our own words for the status where they differ from the plain
   * word ("secondary-sourced, as we read it"); null otherwise. */
  statusLabel: string | null;
  /** The law or source in plain words, or null when unsourced. */
  citation: string | null;
}

/**
 * How a step takes part in the sum, when the working is one: "add"
 * and "less" steps are added up, and a "total" step must equal what
 * came before it since the last total. The last total is the result.
 */
export type StepOp = "add" | "less" | "total";

/** One line of the working, in order. */
export interface ExplainStep {
  text: string;
  value?: ExplainValue;
  op?: StepOp;
}

export interface Explanation {
  /** Stable id, unique across the demo ("gratuity:emp-014"). */
  id: string;
  /** What the figure is: "End-of-service gratuity". */
  title: string;
  /** Who or what it belongs to: a person's name or "Whole pay run". */
  subject: string;
  /** One sentence that answers "why this number". */
  summary: string;
  result: { label: string; value: ExplainValue };
  inputs: ExplainInput[];
  rules: ExplainRule[];
  steps: ExplainStep[];
  /** What this figure leaves out, said plainly. Empty when nothing. */
  notComputed: string[];
  /** Rule scope shown with every figure ("UAE mainland rules"). */
  scope: string;
}

/** Labels for every source status (also used in tests). */
export const STATUS_ORDER: readonly SourceStatus[] = ["official",
  "secondary", "convention", "unsourced"];

export const money = (fils: Fils): ExplainValue => ({ kind: "money", fils });
export const text = (t: string): ExplainValue => ({ kind: "text", text: t });
export const count = (n: number, words: string): ExplainValue =>
  ({ kind: "count", n, text: words });

/** The number a value adds: fils, a count, or none for words. */
function numberOf(v: ExplainValue | undefined): bigint | number | null {
  if (v?.kind === "money") return v.fils;
  if (v?.kind === "count") return v.n;
  return null;
}

/** True when the working opts in to the sum check (has a total). */
export function isSum(e: Explanation): boolean {
  return e.steps.some((x) => x.op === "total");
}

/**
 * The sum check: every run of "add" and "less" steps equals the
 * "total" after it, exactly (fils as bigint, counts as numbers), and
 * the last total is the result. Explanations without ops skip it.
 */
function sumProblems(e: Explanation): string[] {
  if (!e.steps.some((x) => x.op !== undefined)) return [];
  const out: string[] = [];
  let acc: bigint | number | null = null;
  let last: bigint | number | null = null;
  for (const x of e.steps) {
    if (x.op === undefined) continue;
    const n = numberOf(x.value);
    if (n === null) {
      out.push(`step "${x.text}" has no figure to add`);
      continue;
    }
    if (acc !== null && typeof acc !== typeof n) {
      out.push(`step "${x.text}" mixes money and counts`);
      continue;
    }
    if (x.op === "total") {
      if (acc === null) out.push(`total "${x.text}" has nothing before it`);
      else if (acc !== n) out.push(`steps do not add up to "${x.text}"`);
      acc = null;
      last = n;
      continue;
    }
    const sign = x.op === "less" ? -1 : 1;
    acc = typeof n === "bigint"
      ? ((acc as bigint | null) ?? 0n) + BigInt(sign) * n
      : ((acc as number | null) ?? 0) + sign * n;
  }
  if (acc !== null) out.push("steps after the last total");
  const result = numberOf(e.result.value);
  if (last === null) out.push("no total step");
  else if (result !== null && result !== last) {
    out.push("the last total is not the result");
  }
  return out;
}

/** A contract check usable in tests and in development. */
export function contractProblems(e: Explanation): string[] {
  const out: string[] = [];
  if (e.id.trim() === "") out.push("id is empty");
  if (e.title.trim() === "") out.push("title is empty");
  if (e.summary.trim() === "") out.push("summary is empty");
  if (e.steps.length === 0) out.push("no steps");
  if (e.inputs.some((i) => i.from.trim() === "")) {
    out.push("an input has no source");
  }
  if (e.rules.some((r) => r.status !== "unsourced" && r.citation === null)) {
    out.push("a sourced rule has no citation");
  }
  if (e.scope.trim() === "") out.push("scope is empty");
  out.push(...sumProblems(e));
  return out;
}
