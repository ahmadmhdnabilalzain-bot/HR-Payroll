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

/** The inputs a person can read, in plain words, in order. */
function stepsOf(line: TraceLine): ExplainStep[] {
  const i = line.inputs;
  const out: ExplainStep[] = [];
  const add = (t: string, v?: ExplainValue): void => {
    out.push(v === undefined ? { text: t } : { text: t, value: v });
  };
  if (isInt(i["monthly"])) add("Monthly amount", money(i["monthly"]));
  if (isInt(i["paidHalfDays"]) && isInt(i["totalHalfDays"])) {
    add(`Days paid: ${days(Number(i["paidHalfDays"]))} of ` +
      `${days(Number(i["totalHalfDays"]))}`);
  }
  if (isInt(i["basicMonthly"])) add("Basic salary", money(i["basicMonthly"]));
  if (isInt(i["minutes"])) {
    add(`Overtime worked: ${hours(Number(i["minutes"]))}`);
  }
  if (isInt(i["upliftBps"])) {
    add(`Paid at ${100 + Number(i["upliftBps"]) / 100}% of the hourly rate`);
  }
  if (isInt(i["instalment"])) add("Instalment due", money(i["instalment"]));
  if (i["capPercent"] !== undefined) {
    add(`Limit on deductions: ${i["capPercent"]} of the wage`);
  }
  if (isInt(i["deferred"]) && i["deferred"] !== "0") {
    add("Moved to next month", money(i["deferred"]));
  }
  if (isInt(i["gross"])) add("Gross pay", money(i["gross"]));
  if (isInt(i["deductions"])) add("Less deductions", money(i["deductions"]));
  if (isInt(i["lines"]) && out.length === 0) {
    add(`Sum of ${i["lines"]} ${i["lines"] === "1" ? "line" : "lines"}`);
  }
  return out;
}

const STATUSES: readonly SourceStatus[] = ["official", "secondary",
  "convention", "unsourced"];

/** "HALF_UP" and "calendar-days" read as "half up", "calendar days". */
function valueText(v: string | number | boolean): string {
  if (typeof v === "boolean") return v ? "yes" : "no";
  const x = String(v);
  return /^[A-Za-z]+([_-][A-Za-z]+)*$/.test(x)
    ? x.replace(/[_-]/g, " ").toLowerCase() : x;
}

function ruleOf(r: LineSource["rules"][number]): ExplainRule {
  const bps = /Bps$/.test(r.key) && typeof r.value === "number";
  const name = r.key.replace(/Bps$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  const shown = bps ? `${Number(r.value) / 100}%` : valueText(r.value);
  const said = r.presentedLabel === null ? "" : ` (${r.presentedLabel})`;
  const known = STATUSES.find((x) => x === r.presentedStatus);
  const citation = r.source?.note ?? null;
  const status: SourceStatus = citation === null ? "unsourced"
    : known ?? "unsourced";
  return { text: `${name[0]?.toUpperCase() ?? ""}${name.slice(1)}: ` +
    `${shown}${said}`, status, citation,
    statusLabel: r.presentedLabel ?? null };
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
    rules: src.rules.map(ruleOf),
    steps: [...steps, { text: x.label, value: result }],
    notComputed: x.notComputed === null ? [] : [x.notComputed],
    scope: x.scope };
}
