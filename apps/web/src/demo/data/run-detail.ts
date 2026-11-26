import {
  buildDemoCompany,
  demoLabel,
  displayDate,
  duration,
  isDemoLabelKey,
  issuesOf,
  pastRuns,
  plural,
  SIF_CREATED,
  sifSummary,
  type DemoCompany,
  type DemoEmployee,
  type DemoPayslip,
} from "@payroll/demo-data";
import { fils, type Fils } from "@payroll/engine";
import { withIbans } from "./adapter";
import { explainAll } from "./run-explain";
import type {
  ChangeLine,
  FileFinding,
  FileRecord,
  PersonRow,
  RunDetail,
  RunSource,
  RunTotals,
  SalaryFile,
} from "./run-types";

/**
 * The pay run in detail, built from the same company state as the
 * shared store (`withIbans`, the package's applyIbanFix). Last month
 * is September, computed by the same engine from the same records
 * (emp-012 on the old basic, as the package's back-pay derivation).
 */

const PREV = { year: 2026, month: 9 } as const;

const sumOf = (xs: Pick<DemoPayslip, "payslip">[],
  f: (s: Pick<DemoPayslip, "payslip">) => bigint): Fils =>
  fils(xs.reduce((n, s) => n + f(s), 0n));

function totalsOf(xs: Pick<DemoPayslip, "payslip">[]): RunTotals {
  return { gross: sumOf(xs, (s) => s.payslip.gross),
    deductions: sumOf(xs, (s) => s.payslip.totalDeductions),
    net: sumOf(xs, (s) => s.payslip.net),
    employerCost: sumOf(xs, (s) => s.payslip.employerCost),
    headcount: xs.length };
}

/** A month-before payslip: what the comparison reads. */
type Prev = Pick<DemoPayslip, "employeeId" | "payslip" | "input">;

/**
 * September as paid: the package's pastRuns (the same engine, the
 * same records, emp-012 on the old basic, the loan LN-2041 not yet
 * started), so Review, Pay runs and the trend show one September.
 */
function september(c: DemoCompany): Map<string, Prev> {
  const run = pastRuns(c).find((r) => r.month === PREV.month);
  return new Map((run?.payslips ?? []).map((s) => [s.employeeId, s]));
}

export function labelOf(key: string): string {
  return isDemoLabelKey(key) ? demoLabel(key, "en") : key;
}

export function deptOf(c: DemoCompany, e: DemoEmployee): string {
  const d = c.departments.find((x) => x.id === e.departmentId);
  return d === undefined ? "" : labelOf(d.labelKey);
}

const inOctober = (d: string | null): boolean =>
  d !== null && d.startsWith("2026-10");

/** Why a person's pay moved against September, from the inputs. */
const loanTaken = (s: Pick<DemoPayslip, "payslip"> | undefined): bigint =>
  s?.payslip.deductions.filter((d) => d.kind === "loan")
    .reduce((n, d) => n + d.amount, 0n) ?? 0n;

function reasonsOf(e: DemoEmployee, s: DemoPayslip,
  prev: Prev | undefined): string[] {
  const out: string[] = [];
  if (prev === undefined) {
    out.push(`Joined on ${displayDate(e.joiningDate)}, paid from that day`);
  }
  if (inOctober(e.leavingDate) && e.leavingDate !== null) {
    out.push(`Left on ${displayDate(e.leavingDate)}, paid to that day`);
  }
  const unpaid = s.input.absences.filter((a) => a.kind === "unpaid");
  if (unpaid.length > 0) {
    out.push(`${plural(unpaid.length, "day", "days")} of unpaid leave`);
  }
  const sick = s.trace.find((l) => l.id === "leave.sick" &&
    (l.inputs["probation"] ?? "0") !== "0");
  if (sick !== undefined) out.push("A sick day in probation is unpaid");
  const ot = s.input.overtime.reduce((n, o) => n + o.minutes, 0);
  const night = s.input.overtime.reduce((n, o) => n + o.nightMinutes, 0);
  if (ot > 0) {
    out.push(`${duration(ot)} of overtime${night > 0 ? ", at night" : ""}`);
  }
  if (prev !== undefined && prev.input.employee.basicMonthly !==
    s.input.employee.basicMonthly) out.push("New basic salary");
  if (s.input.employee.allowances.some((a) => a.code === "back-pay")) {
    out.push("Back pay for September");
  }
  if (prev !== undefined && loanTaken(prev) !== loanTaken(s)) {
    out.push(loanTaken(prev) === 0n ? "Loan repayments started"
      : "Loan repayment changed");
  }
  return out;
}

function peopleOf(c: DemoCompany, prev: Map<string, Prev>)
  : PersonRow[] {
  const byId = new Map(c.employees.map((e) => [e.id, e]));
  return c.payRun.payslips.map((s) => {
    const e = byId.get(s.employeeId)!;
    const p = prev.get(e.id);
    const change = fils(s.payslip.net - (p?.payslip.net ?? 0n));
    const reasons = reasonsOf(e, s, p);
    return { id: e.id, name: e.fullName, department: deptOf(c, e),
      gross: s.payslip.gross, deductions: s.payslip.totalDeductions,
      net: s.payslip.net, prevNet: p?.payslip.net ?? null, change,
      significant: change !== 0n && reasons.length > 0, reasons,
      inFile: s.sif.included, national: s.pension !== null,
      explainId: `person:${e.id}` };
  });
}

function changesOf(people: PersonRow[], prev: Map<string, Prev>,
  c: DemoCompany): ChangeLine[] {
  const here = new Set(people.map((p) => p.id));
  const gone = [...prev.values()].filter((s) => !here.has(s.employeeId))
    .map((s) => ({ personId: s.employeeId, change: fils(-s.payslip.net),
      name: c.employees.find((e) => e.id === s.employeeId)?.fullName ?? "",
      reason: "Not on this month's payroll" }));
  const abs = (x: bigint): bigint => x < 0n ? -x : x;
  return [...people.filter((p) => p.significant).map((p) => ({
    personId: p.id, name: p.name, change: p.change,
    reason: p.reasons.join("; ") })), ...gone]
    .sort((a, b) => abs(b.change) > abs(a.change) ? 1
      : abs(b.change) < abs(a.change) ? -1 : 0);
}

/** "66250.00" from the file, as whole fils (the file's own text). */
function filsOfText(v: string): Fils {
  const [whole = "0", frac = "0"] = v.split(".");
  return fils(BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0")
    .slice(0, 2)));
}

const group = (iban: string): string =>
  iban.replace(/(.{4})/g, "$1 ").trim();

function recordsOf(c: DemoCompany): FileRecord[] {
  const byPerson = new Map(c.employees.map((e) => [e.labourPersonId, e]));
  return c.sif.text.split(/\r?\n/).filter((l) => l !== "")
    .map((l, i) => ({ l, line: i + 1 }))
    .filter(({ l }) => l.startsWith("EDR"))
    .map(({ l, line }) => {
      const f = l.split(",");
      const fixed = filsOfText(f[7] ?? "0");
      const variable = filsOfText(f[8] ?? "0");
      return { line, name: byPerson.get(f[1] ?? "")?.fullName ?? "",
        account: group(f[3] ?? ""), days: Number(f[6] ?? 0), fixed,
        variable, total: fils(fixed + variable),
        leaveDays: Number(f[9] ?? 0) };
    });
}

function findingsOf(c: DemoCompany): FileFinding[] {
  return issuesOf(c).filter((i) => i.source === "sif-validator")
    .map((i) => ({ id: `${i.code}:${i.subjectId ?? ""}`, title: i.title,
      text: i.plainReason.en, kind: i.kind === "note" ? "note" : "issue",
      person: i.employeeId === null ? null : c.employees.find((e) =>
        e.id === i.employeeId)?.fullName ?? null,
      line: i.sif?.fileLine ?? null }));
}

function fileOf(c: DemoCompany): SalaryFile {
  const s = sifSummary(c);
  const t = SIF_CREATED.time;
  return { fileName: s.fileName, bank: c.company.name,
    dated: SIF_CREATED.date, time: `${t.slice(0, 2)}:${t.slice(2, 4)}`,
    people: s.employees, total: s.total, heldOut: s.heldOut,
    lines: { total: s.lines.total, salary: s.lines.edr,
      allowance: s.lines.evp, control: s.lines.scr },
    linesNote: s.linesNote, records: recordsOf(c),
    findings: findingsOf(c), text: c.sif.text };
}

const REGION = new Intl.DisplayNames(["en"], { type: "region" });

function nationalitiesOf(c: DemoCompany): RunDetail["nationalities"] {
  const n = c.nationalities;
  return { label: n.label, asOf: n.asOf, total: n.headcount,
    rows: n.byNationality.map((r) => ({
      name: REGION.of(r.nationality) ?? r.nationality, count: r.count })) };
}

export function detailOf(c: DemoCompany, prev: Map<string, Prev>)
  : RunDetail {
  const people = peopleOf(c, prev);
  const file = fileOf(c);
  const ex = explainAll(c);
  const month = `${c.payRun.year}-${String(c.payRun.month)
    .padStart(2, "0")}`;
  return { month, prevMonth: "2026-09", totals: totalsOf(c.payRun.payslips),
    prev: totalsOf([...prev.values()]), changes: changesOf(people, prev, c),
    people, file, explain: ex.byId, featured: ex.featured,
    settlements: ex.settlements, nationalities: nationalitiesOf(c),
    register: [{ fileName: file.fileName, month, people: file.people,
      total: file.total, dated: file.dated, heldOut: file.heldOut }],
    scope: c.rulesScope, pensionNote: ex.pensionNote,
    preparedOn: SIF_CREATED.date, preparedAt: file.time };
}

/** One detail per IBAN state, cached like the shared source. */
export function buildRunSource(): RunSource {
  const base = buildDemoCompany();
  const prev = september(base);
  const cache = new Map<string, RunDetail>();
  return {
    at: (ibans) => {
      const key = JSON.stringify(Object.entries(ibans).sort());
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const d = detailOf(withIbans(base, ibans), prev);
      cache.set(key, d);
      return d;
    },
  };
}
