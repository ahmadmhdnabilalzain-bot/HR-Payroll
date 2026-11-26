import { fils, type TraceLine } from "@payroll/engine";
import type {
  ExplainRule,
  ExplainStep,
  Explanation,
  ExplainValue,
  SourceStatus,
} from "../../components/explain/types";

/**
 * One payslip line as the shared explain panel's Explanation. Built
 * from the package's explainPayslipLine (people.ts passes it in), so
 * this file imports no package and stays a pure mapping. Fils never
 * show as bare numbers: amounts become money values for <Money>.
 */

/** What people.ts hands over from explainPayslipLine. */
export interface LineSource {
  line: TraceLine;
  text: { en: string; ar: string };
  rules: { key: string; value: string | number | boolean;
    presentedStatus: string; presentedLabel: string | null;
    source: { note: string } | null }[];
}

const money = (x: string): ExplainValue =>
  ({ kind: "money", fils: fils(BigInt(x)) });
const text = (x: string): ExplainValue => ({ kind: "text", text: x });
const isInt = (x: string | undefined): x is string =>
  x !== undefined && /^-?\d+$/.test(x);

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hs = h === 0 ? "" : `${h} ${h === 1 ? "hour" : "hours"}`;
  const ms = m === 0 ? "" : `${m} minutes`;
  return [hs, ms].filter(Boolean).join(" ") || "0 minutes";
}

const days = (halves: number): string => {
  const d = halves / 2;
  return Number.isInteger(d) ? String(d) : `${Math.floor(d)}½`;
};

/** The inputs a person can read, in plain words, in order. Every
 * step carries its figure: money as money, the rest as short words. */
function stepsOf(line: TraceLine): ExplainStep[] {
  const i = line.inputs;
  const out: ExplainStep[] = [];
  const add = (t: string, v: ExplainValue): void => {
    out.push({ text: t, value: v });
  };
  if (isInt(i["monthly"])) add("Monthly amount", money(i["monthly"]));
  if (isInt(i["paidHalfDays"]) && isInt(i["totalHalfDays"])) {
    add("Days paid", text(`${days(Number(i["paidHalfDays"]))} of ` +
      `${days(Number(i["totalHalfDays"]))}`));
  }
  if (isInt(i["basicMonthly"])) add("Basic salary", money(i["basicMonthly"]));
  if (isInt(i["basicMonthly"]) && isInt(i["dailyDivisor"]) &&
    isInt(i["hoursPerDay"])) {
    const rate = Number(i["basicMonthly"]) /
      (Number(i["dailyDivisor"]) * Number(i["hoursPerDay"]));
    add(`Hourly rate: basic salary over ${i["dailyDivisor"]} days of ` +
      `${i["hoursPerDay"]} hours`, money(String(Math.round(rate))));
  }
  if (isInt(i["minutes"])) {
    add("Overtime worked", text(hours(Number(i["minutes"]))));
  }
  if (isInt(i["upliftBps"])) {
    add("Paid at this share of the hourly rate",
      text(`${100 + Number(i["upliftBps"]) / 100}%`));
  }
  if (isInt(i["instalment"])) add("Instalment due", money(i["instalment"]));
  if (i["capPercent"] !== undefined) {
    add("Limit on deductions", text(`${i["capPercent"]} of the wage`));
  }
  if (isInt(i["deferred"]) && i["deferred"] !== "0") {
    add("Moved to next month", money(i["deferred"]));
  }
  if (isInt(i["gross"])) add("Gross pay", money(i["gross"]));
  if (isInt(i["deductions"])) add("Less deductions", money(i["deductions"]));
  if (isInt(i["lines"]) && out.length === 0) {
    add("Lines added up", text(`${i["lines"]} ${i["lines"] === "1"
      ? "line" : "lines"}`));
  }
  return out;
}

const STATUSES: readonly SourceStatus[] = ["official", "secondary",
  "convention", "unsourced"];

/** A flag as the pack carries it: a boolean or "true". */
const yes = (v: string | number | boolean): boolean =>
  v === true || v === "true";
const pct = (bps: unknown): string => `${Number(bps) / 100}%`;
const mins = (m: unknown): string => hours(Number(m));

/**
 * Each rule-pack parameter as a plain sentence. A parameter that only
 * pins a rounding or a technical choice is left out (null): it is not
 * something a person reads to follow the sum.
 */
const SENTENCES: Record<string, (v: string | number | boolean)
  => string | null> = {
  prorationBasis: () => "A part month is worked out on calendar days.",
  maxNormalHoursPerDay: (v) => `A normal working day is up to ${v} hours.`,
  paidLeaveBase: () => "Paid leave is paid on the full wage.",
  roundingMode: () => null,
  capRoundingMode: () => null,
  deductionCapBase: () =>
    "The limit on deductions is worked out on the wage earned.",
  deductionOverallCapBps: (v) =>
    `Deductions may take at most ${pct(v)} of the wage.`,
  loanConsentRequired: (v) => yes(v)
    ? "A loan is taken from pay only with the employee's consent." : null,
  deductionOrder: () => "Deductions are taken in a set order, loans last.",
  sickFullPayDays: (v) => `Sick leave is paid in full for ${v} days.`,
  sickHalfPayDays: (v) => `Then at half pay for the next ${v} days.`,
  sickMaxDays: (v) => `Sick leave counts for at most ${v} days a year.`,
  sickPaidInProbation: (v) => !yes(v)
    ? "Sick leave in the probation period is unpaid." : null,
  overtimeUpliftBps: (v) =>
    `Overtime is paid at ${100 + Number(v) / 100}% of the hourly rate.`,
  dailyDivisor: (v) =>
    `A day's pay is the monthly wage divided by ${v}.`,
  shiftWorkersNightExcluded: (v) => yes(v)
    ? "Night overtime does not apply to shift workers."
    : null,
  overtimeMaxMinutesPerDay: (v) =>
    `Overtime counts for at most ${mins(v)} a day.`,
  nightOvertimeUpliftBps: (v) =>
    `Overtime at night is paid at ${100 + Number(v) / 100}% of the ` +
    "hourly rate.",
  nightWindow: (v) => `Night hours are ${String(v).replace("-", " to ")}.`,
};

/** A key with no sentence yet: its name in words, never "key: value". */
function fallback(key: string): string {
  const w = key.replace(/Bps$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return `${w[0]?.toUpperCase() ?? ""}${w.slice(1)} applies.`;
}

/** The source note in our words: no internal paths, no jargon. */
function citationOf(note: string | null, status: SourceStatus)
  : string | null {
  if (note === null) return null;
  if (status === "convention" || /convention/i.test(note)) {
    return "Our own working, as we apply it";
  }
  return /^docs\//.test(note) ? "Our research notes" : note;
}

function ruleOf(r: LineSource["rules"][number]): ExplainRule | null {
  const sentence = (SENTENCES[r.key] ?? (() => fallback(r.key)))(r.value);
  if (sentence === null) return null;
  const known = STATUSES.find((x) => x === r.presentedStatus);
  const status: SourceStatus = r.source === null ? "unsourced"
    : known ?? "unsourced";
  return { text: sentence, status, statusLabel: r.presentedLabel,
    citation: citationOf(r.source?.note ?? null, status) };
}

/** One sentence once, whichever parameters said it. */
function rulesOf(src: LineSource["rules"]): ExplainRule[] {
  const seen = new Set<string>();
  return src.map(ruleOf).filter((r): r is ExplainRule => {
    if (r === null || seen.has(r.text)) return false;
    seen.add(r.text);
    return true;
  });
}

/** The engine's sentence without its closing status list. */
const plain = (x: string): string => x.replace(/\s*\([^()]*\)\.$/, ".");

export function toExplanation(id: string, src: LineSource, x: {
  label: string; subject: string; lang: "en" | "ar"; scope: string;
  notComputed: string | null }): Explanation {
  const result = isInt(src.line.result) ? money(src.line.result)
    : text(x.notComputed === null ? src.line.result : "Not computed");
  const steps = stepsOf(src.line);
  return { id, title: x.label, subject: x.subject,
    summary: plain(src.text[x.lang]),
    result: { label: x.label, value: result }, inputs: [],
    rules: rulesOf(src.rules),
    steps: [...steps, { text: x.label, value: result }],
    notComputed: x.notComputed === null ? [] : [x.notComputed],
    scope: x.scope };
}
