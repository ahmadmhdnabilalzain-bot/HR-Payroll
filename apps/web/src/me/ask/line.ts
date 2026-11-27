import { fils as toFils, type Fils } from "@payroll/engine";
import type {
  Explanation,
  ExplainRule,
  ExplainValue,
} from "../../components/explain/types";
import type { DemoData } from "../../demo/data/types";
import type { PayslipView } from "../../demo/data/people-types";

/**
 * E16: the words for "About this line" on a payslip. Rule-based: every
 * sentence is put together from the payslip, its explain data and the
 * earlier months' totals. No figure is typed here and none is turned
 * into text: an amount stays an amount part, and the screen draws it
 * with <Money>, so "hide amounts" masks it like everywhere else.
 */

/** A sentence is words and amounts, in order. */
export type Part = string | { fils: Fils; signed?: true };
export type Sentence = readonly Part[];

/** The line the employee tapped: a line, a total or the net. */
export interface LineRef {
  traceId: string;
  label: string;
  /** The engine's line kind ("overtime"), or "gross" and so on. */
  kind: string;
  group: "earning" | "deduction" | "gross" | "deductions" | "net";
  amountFils: Fils;
}

export interface Question {
  id: string;
  label: Sentence;
  answer: readonly Sentence[];
}

const money = (fils: Fils, signed = false): Part =>
  signed ? { fils, signed: true } : { fils };

/** What a kind of line is, in a plain sentence (no figures). */
const WHAT: Record<string, string> = {
  basic: "Basic salary is the fixed monthly pay in your contract.",
  housing: "A housing allowance is a fixed monthly addition to basic " +
    "salary.",
  conveyance: "A transport allowance is a fixed monthly addition to " +
    "basic salary.",
  transport: "A transport allowance is a fixed monthly addition to " +
    "basic salary.",
  phone: "A phone allowance is a fixed monthly addition to basic salary.",
  overtime: "Overtime is pay for signed-off hours beyond a normal day.",
  "rest-day": "Rest day pay is for signed-off work on a day off.",
  holiday: "Holiday pay is for signed-off work on a public holiday.",
  "back-pay": "Back pay makes up an earlier shortfall.",
  "leave-encashment": "Leave encashment pays leave days that were not " +
    "taken.",
  loan: "A loan instalment is taken from pay, with your consent, in " +
    "a set order after other deductions.",
  gross: "Gross pay is every earning line added up, before deductions.",
  deductions: "Deductions are what is taken from gross pay.",
  net: "Net pay is gross pay less deductions: what is paid to you.",
};

const STATUS_WORD: Record<ExplainRule["status"], string> = {
  official: "from the law",
  secondary: "as we read it",
  convention: "our own working",
  unsourced: "not sourced",
};

const valueParts = (v: ExplainValue): Part[] =>
  v.kind === "money" ? [money(v.fils)] : [v.text];

/** One sentence per rule, with how sure we are of it. */
export function ruleSentences(ex: Explanation): Sentence[] {
  return ex.rules.map((r) => [`${r.text} (${r.statusLabel ??
    STATUS_WORD[r.status]}${r.citation === null ? "" : `: ${r.citation}`})`]);
}

/** The working, one sentence per step. */
function stepSentences(ex: Explanation): Sentence[] {
  return ex.steps.map((s) => {
    if (s.limit !== undefined) {
      return [`${s.text}: `, money(s.limit.used), " of ",
        money(s.limit.cap), "."];
    }
    if (s.value === undefined) return [`${s.text}.`];
    return s.value.kind === "money"
      ? [`${s.text} is `, money(s.value.fils), "."]
      : [`${s.text}: `, ...valueParts(s.value), "."];
  });
}

/** The sheet's body: what the line is, the figure, then the working. */
export function aboutLine(ex: Explanation, line: LineRef): Sentence[] {
  const what = WHAT[line.kind];
  return [
    ...(what === undefined ? [] : [[what] as Sentence]),
    [`${line.label} on this payslip is `, money(line.amountFils), "."],
    ...stepSentences(ex),
    ...ex.notComputed.map((n): Sentence => [n]),
  ];
}

/** The month before this one in the person's own history, or null. */
function previous(d: DemoData, slip: PayslipView)
  : { month: string; gross: Fils; net: Fils } | null {
  const past = d.home.payslips(slip.employeeId)
    .filter((x) => x.month < slip.month);
  const last = past.at(-1);
  return last === undefined ? null : { month: last.month,
    gross: last.grossFils, net: last.netFils };
}

/** Lines that come and go from one month to the next. */
const VARIABLE = new Set(["overtime", "rest-day", "holiday", "back-pay",
  "leave-encashment"]);

function netChange(d: DemoData, slip: PayslipView,
  monthName: (m: string) => string): Question | null {
  const was = previous(d, slip);
  if (was === null) return null;
  const name = monthName(was.month);
  const dNet = toFils(slip.netFils - was.net);
  const dGross = toFils(slip.grossFils - was.gross);
  const dDed = toFils(slip.deductionsFils - (was.gross - was.net));
  const answer: Sentence[] = dNet === 0n
    ? [[`Your net pay is the same as in ${name}: `, money(slip.netFils),
      "."]]
    : [[`Your net pay is `, money(slip.netFils), ` this month and was `,
      money(was.net), ` in ${name}, a change of `, money(dNet, true), "."],
    ["Gross pay changed by ", money(dGross, true),
      " and deductions by ", money(dDed, true), "."]];
  for (const l of slip.lines) {
    if (l.group === "earning" && VARIABLE.has(l.kind)) {
      answer.push([`This month's payslip has a line for ${l.engineLabel
        .toLowerCase()}: `, money(l.amountFils), "."]);
    }
  }
  return { id: "net-change",
    label: [`Why did my net change from ${name}?`], answer };
}

/** The suggested questions for a line, answered from the data. */
export function lineQuestions(d: DemoData, slip: PayslipView, line: LineRef,
  ex: Explanation, monthName: (m: string) => string): Question[] {
  const out: Question[] = [];
  if (line.group === "net") {
    out.push({ id: "net-how", label: ["How is my net pay worked out?"],
      answer: [["Gross pay ", money(slip.grossFils), " less deductions ",
        money(slip.deductionsFils), " is ", money(slip.netFils), "."]] });
    const c = netChange(d, slip, monthName);
    if (c !== null) out.push(c);
    return out;
  }
  if (line.group === "gross") {
    out.push({ id: "gross-what", label: ["What is in my gross pay?"],
      answer: slip.lines.filter((l) => l.group === "earning").map(
        (l): Sentence => [`${l.engineLabel}: `, money(l.amountFils)]) });
    const c = netChange(d, slip, monthName);
    if (c !== null) out.push(c);
    return out;
  }
  if (line.group === "deductions") {
    out.push({ id: "ded-what", label: ["What was taken from my pay?"],
      answer: slip.lines.filter((l) => l.group === "deduction").map(
        (l): Sentence => [`${l.engineLabel}: `, money(l.amountFils)]) });
    return out;
  }
  const why: Sentence = line.group === "deduction"
    ? ["Why was ", money(line.amountFils), ` taken for ${line.label
      .toLowerCase()}?`]
    : [`Why is ${line.label.toLowerCase()} `, money(line.amountFils), "?"];
  out.push({ id: "why", label: why, answer: stepSentences(ex) });
  if (ex.rules.length > 0) {
    out.push({ id: "rules",
      label: [`Which rules apply to ${line.label.toLowerCase()}?`],
      answer: ruleSentences(ex) });
  }
  const c = line.group === "earning" && VARIABLE.has(line.kind)
    ? netChange(d, slip, monthName) : null;
  if (c !== null) out.push(c);
  return out;
}

/** The in-app request "Ask HR about this line" starts from. */
export function askHrDraft(line: LineRef, month: string,
  amountText: string): { category: string; subject: string; text: string } {
  return { category: "Payslip",
    subject: `Question about ${line.label}, ${month} payslip`,
    text: `Please could you explain "${line.label}" on my ${month} ` +
      `payslip? It shows ${amountText}.` };
}
