import {
  displayDate,
  duration,
  PENSION_NOT_COMPUTED,
  plural,
  PRESENTED_STATUS,
  sourceOf,
  type DemoCompany,
  type DemoEmployee,
  type DemoPayslip,
} from "@payroll/demo-data";
import {
  fils,
  type Fils,
  type TraceLine,
  type TraceRule,
} from "@payroll/engine";
import {
  money,
  text,
  type ExplainInput,
  type ExplainRule,
  type ExplainStep,
  type Explanation,
} from "../../components/explain/types";
import { rulePlain } from "./run-rules";

/**
 * Every explanation the demo offers, from the engine's own trace: the
 * inputs and where they came from, the rules with their source and
 * status, the working step by step, and what is left out. Steps add up
 * to the engine's result to the fils (tests/unit/explain.test.ts).
 */

const BANK = "Employee record";
const TIME = "October timesheet";
const LEAVE = "Leave records";
const LOAN = "Loan record";

const year = (iso: string): string => `${displayDate(iso)}`
  + (iso.startsWith("2026") ? " 2026" : "");

const num = (v: string | undefined): bigint => BigInt(v ?? "0");

/** "28500/365" or "105" as a readable number of days, 2 decimals. */
function daysText(v: string | undefined): string {
  const [a = "0", b = "1"] = (v ?? "0").split("/");
  const n = Number(a) / Number(b);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** a * b / c, rounded half up, in fils. */
function mulDiv(a: bigint, b: bigint, c: bigint): Fils {
  return fils((a * b * 2n + c) / (c * 2n));
}

const line = (s: { trace: TraceLine[] }, id: string)
  : TraceLine | undefined => s.trace.find((l) => l.id === id);

const SKIP = new Set(["leapDayAnniversary", "nightWindow",
  "shiftWorkersNightExcluded"]);

/** The rules behind some trace lines, plain, deduplicated. */
export function rulesOf(lines: (TraceLine | undefined)[]): ExplainRule[] {
  const seen = new Set<string>();
  const out: ExplainRule[] = [];
  for (const r of lines.flatMap((l) => l?.rules ?? [])) {
    if (SKIP.has(r.key)) continue;
    const shown = r.overridden ? undefined
      : PRESENTED_STATUS[`${r.packId}:${r.key}`];
    const status = shown === undefined ? statusOf(r)
      : shown.status as ExplainRule["status"];
    const note = sourceOf(r)?.note ?? null;
    const plain = rulePlain(r.key, note, status);
    if (seen.has(plain.text)) continue;
    seen.add(plain.text);
    out.push({ text: plain.text, status,
      statusLabel: shown?.label.en ?? null,
      citation: shown === undefined || note === null ? plain.citation
        : `${note}.` });
  }
  return out;
}

/** A hypothetical rule is shown as having no source. */
const statusOf = (r: TraceRule): ExplainRule["status"] =>
  r.status === "hypothetical" ? "unsourced" : r.status;

function base(c: DemoCompany, id: string, title: string, subject: string)
  : Pick<Explanation, "id" | "title" | "subject" | "scope"> {
  return { id, title, subject, scope: c.rulesScope };
}

function gratuity(c: DemoCompany, e: DemoEmployee): Explanation | null {
  const st = c.payRun.settlements.find((x) => x.employeeId === e.id);
  if (st === undefined || e.leavingDate === null) return null;
  const years = line(st, "service.years");
  const days = line(st, "service.days");
  const t1 = line(st, "gratuity.tier1");
  const t2 = line(st, "gratuity.tier2");
  const cap = line(st, "gratuity.cap");
  const total = line(st, "gratuity.total");
  const leave = line(st, "leave.pay");
  const basic = num(total?.inputs["lastBasicMonthly"]);
  const daily = mulDiv(basic, 1n, 30n);
  const tier1Days = num(t1?.result);
  const tier1 = mulDiv(basic, tier1Days, 30n);
  const g = st.result.gratuity;
  const m = /^(\d+) years? and (\d+) days?/.exec(years?.result ?? "");
  const done = Number(m?.[1] ?? 0);
  const left = Number(m?.[2] ?? 0);
  const service = `${plural(done, "year", "years")} and ` +
    plural(left, "day", "days");
  const after = done >= 5 ? `${plural(done - 5, "year", "years")} and ` +
    plural(left, "day", "days") : "none";
  const unpaid = Number(days?.inputs["unpaidLeaveDays"] ?? 0);
  const unused = st.unusedLeaveDays;
  const first = e.fullName.split(" ")[0] ?? e.fullName;
  const inputs: ExplainInput[] = [
    { label: "Joined", value: text(year(e.joiningDate)), from: BANK },
    { label: "Last working day", value: text(year(e.leavingDate)),
      from: BANK },
    { label: "Last basic salary, monthly", value: money(fils(basic)),
      from: BANK },
    { label: "Unpaid leave days", value: text(String(unpaid)),
      from: LEAVE },
    { label: "Unused annual leave", value: text(plural(unused, "day",
      "days")), from: LEAVE },
    { label: "Worker type", value: text("Full time, not a UAE national"),
      from: BANK },
  ];
  const steps: ExplainStep[] = [
    { text: `Service from ${year(e.joiningDate)} to ` +
      `${year(e.leavingDate)}` + (unpaid === 0
      ? ", with no unpaid days to take off" : `, less ${unpaid} unpaid ` +
        "days") + ".", value: text(service) },
    { text: "A day's basic wage is the monthly basic divided by 30.",
      value: money(daily) },
    { text: `First 5 years at 21 days a year: ${daysText(t1?.result)} ` +
      "days of basic wage.", value: money(tier1) },
    { text: `The ${after} after that at 30 days a year: ` +
      `${daysText(t2?.result)} days of basic wage.`,
    value: money(fils(g - tier1)) },
    { text: `Together ${daysText(total?.inputs["daysOwed"])} days, ` +
      "worked out exactly and rounded once, to two decimals.",
    value: money(g) },
    { text: "The limit is two years' basic wage. " +
      (cap?.inputs["capApplied"] === "true" ? "It is reached, so the " +
        "gratuity stops there." : "It is not reached."),
    limit: { used: g, cap: fils(num(cap?.result)) } },
    { text: `Unused annual leave: ${plural(unused, "day", "days")} at a ` +
      "day's basic wage. Paid with the gratuity, not part of it.",
    value: money(st.result.leavePay) },
    { text: "Worked out so far: gratuity plus unused leave pay.",
      value: money(st.result.total) },
  ];
  const nc = st.result.notComputed;
  return { ...base(c, `gratuity:${e.id}`, "End-of-service gratuity",
    e.fullName),
  summary: `${first} worked ${service}. The law gives 21 days of basic ` +
    "wage for each of the first five years and 30 days for each year " +
    "after that, on the last basic wage.",
  result: { label: "Gratuity", value: money(g) }, inputs,
  rules: rulesOf([days, years, t1, t2, cap, total, leave]), steps,
  notComputed: [
    ...(nc.includes("notice pay") ? ["Notice pay is not worked out " +
      "here. It depends on the notice given; add it by hand."] : []),
    ...(nc.includes("deductions") ? ["Deductions the law allows from " +
      "the gratuity (amounts owed by law or court order) are not " +
      "worked out here."] : []),
    ...(nc.includes("other dues") ? ["Other dues, such as a ticket " +
      "home or a bonus in the contract, are not worked out here."] : []),
    "Paid outside the October pay run and the salary file.",
  ] };
}

function overtime(c: DemoCompany, e: DemoEmployee, s: DemoPayslip)
  : Explanation | null {
  const ls = s.trace.filter((l) => l.id.startsWith("earn.overtime."));
  if (ls.length === 0) return null;
  const basic = s.input.employee.basicMonthly;
  const hours = BigInt(s.input.employee.normalHoursPerDay);
  const hourly = mulDiv(basic, 1n, 30n * hours);
  const total = fils(ls.reduce((n, l) => n + num(l.result), 0n));
  const minutes = s.input.overtime.reduce((n, o) => n + o.minutes, 0);
  const days: ExplainStep[] = s.input.overtime.map((o) => ({
    text: `${displayDate(o.date)}: ${duration(o.minutes)}` +
      (o.nightMinutes > 0 ? ", after 10 pm" : "") +
      (o.minutes > 120 ? ". Above the 2-hour daily limit." : "."),
  }));
  const parts: ExplainStep[] = ls.map((l) => {
    const up = Number(l.inputs["upliftBps"] ?? 0) / 100;
    const mins = Number(l.inputs["minutes"] ?? 0);
    return { text: `${duration(mins)} at the hourly basic plus ${up}%: ` +
      `monthly basic × ${100 + up}% × hours ÷ (30 days × ${hours} ` +
      "hours), rounded once.", value: money(fils(num(l.result))) };
  });
  const over = s.input.overtime.filter((o) => o.minutes > 120);
  return { ...base(c, `overtime:${e.id}`, "Overtime pay", e.fullName),
    summary: `${duration(minutes)} of overtime in October, each hour ` +
      "paid at the hourly basic wage plus the overtime rate. Every " +
      "minute is paid, including time above the daily limit.",
    result: { label: "Overtime pay", value: money(total) },
    inputs: [
      { label: "Basic salary, monthly", value: money(basic), from: BANK },
      { label: "Normal hours a day", value: text(String(hours)),
        from: BANK },
      { label: "Overtime", value: text(duration(minutes)), from: TIME },
    ],
    rules: rulesOf(ls),
    steps: [...days,
      { text: `Hourly basic wage: monthly basic ÷ 30 days ÷ ${hours} ` +
        "hours (shown rounded; the working keeps every fraction).",
      value: money(hourly) },
      ...parts,
      ...(ls.length > 1 ? [{ text: "Together.", value: money(total) }]
        : []),
      ...over.map((o) => ({ text: `On ${displayDate(o.date)} the ` +
        `overtime was ${duration(o.minutes)}, above the 2-hour limit. ` +
        "It is shown as a check, not cut from the pay." }))],
    notComputed: [] };
}

function loanCap(c: DemoCompany, e: DemoEmployee, s: DemoPayslip)
  : Explanation | null {
  const d = s.payslip.deferred[0];
  if (d === undefined) return null;
  const capBase = line(s, "cap.base");
  const cap = line(s, "cap.overall");
  const ded = line(s, `ded.${d.kind}#${d.ref}`);
  const before = num(ded?.inputs["balanceBefore"]);
  const after = num(ded?.inputs["balanceAfter"]);
  const first = e.fullName.split(" ")[0] ?? e.fullName;
  return { ...base(c, `loan:${e.id}`, "Loan deduction, capped",
    e.fullName),
  summary: `${first}'s loan instalment is more than the deduction ` +
    "limit allows in one month: all deductions together may not be " +
    "more than half of the wage, as we read it. The rest moves to " +
    "next month.",
  result: { label: "Deducted this month", value: money(d.taken) },
  inputs: [
    { label: "Wage earned this month", value:
      money(fils(num(capBase?.result))), from: "October payslip" },
    { label: "Loan instalment", value: money(d.requested), from: LOAN },
    { label: "Loan balance before", value: money(fils(before)),
      from: LOAN },
    { label: "Written agreement", value: text("On file"), from: LOAN },
  ],
  rules: rulesOf([capBase, cap, ded]),
  steps: [
    { text: "Wage earned this month, basic and allowances.",
      value: money(fils(num(capBase?.result))) },
    { text: "Half of it is the most that may be deducted, rounded down.",
      value: money(fils(num(cap?.result))) },
    { text: "The instalment asked for.", value: money(d.requested) },
    { text: "Deducted: the instalment, up to the limit.",
      value: money(d.taken) },
    { text: "Moves to next month.", value: money(d.deferred) },
    { text: "Loan balance after this month.", value: money(fils(after)) },
  ],
  notComputed: [] };
}

const KIND: Record<string, string> = { basic: "Basic salary",
  housing: "Housing allowance", conveyance: "Transport allowance",
  loan: "Loan repayment" };

function lineLabel(l: { kind: string; label: string; traceId: string })
  : string {
  if (l.traceId.endsWith("#back-pay")) return "Back pay for September";
  if (KIND[l.kind] !== undefined) return KIND[l.kind]!;
  const m = /^Allowance (.+)$/.exec(l.label);
  return m === null ? l.label : `${m[1]![0]!.toUpperCase()}` +
    `${m[1]!.slice(1)} allowance`;
}

function person(c: DemoCompany, e: DemoEmployee, s: DemoPayslip)
  : Explanation {
  const p = s.payslip;
  const steps: ExplainStep[] = [];
  const part = p.unpaidDays > 0 || p.payStart.slice(8) !== "01" ||
    Number(p.payEnd.slice(8)) < p.daysInPeriod;
  if (part) {
    steps.push({ text: `Paid from ${displayDate(p.payStart)} to ` +
      `${displayDate(p.payEnd)}` + (p.unpaidDays > 0 ? `, less ` +
      `${plural(p.unpaidDays, "unpaid day", "unpaid days")}` : "") +
      ", by calendar days." });
  }
  for (const l of p.earnings) {
    steps.push({ text: lineLabel(l), value: money(l.amount) });
  }
  steps.push({ text: "Gross pay", value: money(p.gross) });
  for (const l of p.deductions) {
    steps.push({ text: `Less ${lineLabel(l).toLowerCase()}`,
      value: money(l.amount) });
  }
  steps.push({ text: "Net pay", value: money(p.net) });
  if (!s.sif.included) {
    steps.push({ text: "Held out of the salary file until the bank " +
      "details are entered." });
  }
  const days = line(s, "payroll.days");
  return { ...base(c, `person:${e.id}`, "Net pay", e.fullName),
    summary: "Each pay line comes from the employee record and the " +
      "October timesheet; net pay is gross pay less deductions.",
    result: { label: "Net pay", value: money(p.net) },
    inputs: [
      { label: "Basic salary, monthly", value:
        money(s.input.employee.basicMonthly), from: BANK },
      ...s.input.employee.allowances.filter((a) => a.code !== "back-pay")
        .map((a) => ({ label: lineLabel({ kind: a.kind,
          label: `Allowance ${a.code}`, traceId: a.code }),
        value: money(a.monthly), from: BANK })),
      ...(s.input.overtime.length > 0 ? [{ label: "Overtime",
        value: text(duration(s.input.overtime.reduce((n, o) =>
          n + o.minutes, 0))), from: TIME }] : []),
      ...(s.input.absences.length > 0 ? [{ label: "Absences",
        value: text(plural(s.input.absences.length, "day", "days")),
        from: LEAVE }] : []),
    ],
    rules: part ? rulesOf([days]) : [],
    steps,
    notComputed: s.pension === null ? [] : [PENSION_NOT_COMPUTED.en] };
}

function runNet(c: DemoCompany): Explanation {
  const t = c.payRun.totals;
  const n = c.payRun.payslips.length;
  const held = c.payRun.payslips.filter((s) => !s.sif.included).length;
  return { ...base(c, "run:net", "Net pay, whole run", "Whole pay run"),
    summary: `The sum of ${n} payslips, each worked out by the payroll ` +
      "line by line, exactly. Nothing is rounded at the total.",
    result: { label: "Net pay", value: money(t.net) },
    inputs: [{ label: "Payslips", value: text(String(n)),
      from: "October payroll" }],
    rules: [],
    steps: [
      { text: `Gross pay of ${n} people`, value: money(t.gross) },
      { text: "Less deductions", value: money(t.deductions) },
      { text: "Net pay", value: money(t.net) },
      { text: `In the salary file (${n - held} people)`,
        value: money(c.sif.total) },
      { text: held === 0 ? "Held out: nobody" : `Held out, no IBAN ` +
        `(${plural(held, "person", "people")})`, value: money(t.heldNet) },
    ],
    notComputed: [PENSION_NOT_COMPUTED.en] };
}

export interface Explained {
  byId: Record<string, Explanation>;
  featured: string[];
  settlements: { personId: string; name: string; total: Fils;
    explainId: string; lastDay: string }[];
  pensionNote: string;
}

export function explainAll(c: DemoCompany): Explained {
  const byId: Record<string, Explanation> = {};
  const put = (x: Explanation | null): void => {
    if (x !== null) byId[x.id] = x;
  };
  const featured: string[] = [];
  for (const e of c.employees) {
    const s = c.payRun.payslips.find((p) => p.employeeId === e.id);
    put(gratuity(c, e));
    if (s === undefined) continue;
    put(person(c, e, s));
    put(overtime(c, e, s));
    put(loanCap(c, e, s));
  }
  put(runNet(c));
  const pick = (prefix: string, tag: string): void => {
    const e = c.employees.find((x) => x.cases.includes(
      tag as DemoEmployee["cases"][number]));
    if (e !== undefined && byId[`${prefix}:${e.id}`] !== undefined) {
      featured.push(`${prefix}:${e.id}`);
    }
  };
  pick("gratuity", "leaver");
  pick("overtime", "overtime");
  pick("loan", "loan-over-cap");
  featured.push("run:net");
  const settlements = c.payRun.settlements.map((s) => ({
    personId: s.employeeId, total: s.result.total,
    name: c.employees.find((e) => e.id === s.employeeId)?.fullName ?? "",
    explainId: `gratuity:${s.employeeId}`,
    lastDay: c.employees.find((e) => e.id === s.employeeId)?.leavingDate
      ?? "" }));
  return { byId, featured, settlements,
    pensionNote: PENSION_NOT_COMPUTED.en };
}
