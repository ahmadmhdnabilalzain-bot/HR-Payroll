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

export type ExplainValue =
  | { kind: "money"; fils: Fils }
  | { kind: "text"; text: string };

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

/** One line of the working, in order. */
export interface ExplainStep {
  text: string;
  value?: ExplainValue;
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
  return out;
}
