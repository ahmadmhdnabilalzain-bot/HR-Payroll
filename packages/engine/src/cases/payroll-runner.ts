import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { EngineError } from "../errors";
import { fils } from "../money";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../payroll/payslip";
import type { PayslipInput } from "../payroll/types";
import { sourceOf } from "../sources";
import type { TraceLine } from "../trace-types";
import {
  PayrollCaseFileSchema,
  type PayrollCaseFile,
} from "./payroll-schema";

export interface PayrollExpected { gross: string; totalDeductions: string;
  net: string; employerCost: string }

export interface PayrollCaseReport { id: string; passed: boolean;
  expected: PayrollExpected; actual: PayrollExpected | string;
  trace: TraceLine[] }

function invalidCase(file: string, why: string): EngineError {
  return new EngineError("INVALID_CASE_FILE",
    `invalid case file ${file}: ${why}`, { file, why });
}

function parseCase(file: string, text: string): PayrollCaseFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw invalidCase(file, "not valid JSON");
  }
  const parsed = PayrollCaseFileSchema.safeParse(json);
  if (!parsed.success) throw invalidCase(file, parsed.error.message);
  for (const id of parsed.data.sourceIds) {
    try {
      sourceOf(id);
    } catch {
      throw invalidCase(file, `unknown sourceId ${id}`);
    }
  }
  return parsed.data;
}

const f = (s: string) => fils(BigInt(s));

/** Digit strings to fils; the schema has checked every shape. */
function toInput(c: PayrollCaseFile): PayslipInput {
  const i = c.input;
  const e = i.employee;
  const g = e.gpssa;
  return { ...i,
    employee: { ...e, basicMonthly: f(e.basicMonthly),
      allowances: e.allowances.map((a) => ({ ...a, monthly: f(a.monthly) })),
      gpssa: g === null ? null : { ...g, fixingBasic: f(g.fixingBasic),
        fixingAllowances: f(g.fixingAllowances), arrears: f(g.arrears) } },
    deductions: i.deductions.map((d) => ({ ...d, amount: f(d.amount) })),
    loans: i.loans.map((l) => ({ ...l, instalment: f(l.instalment),
      balance: f(l.balance) })) };
}

const same = (a: PayrollExpected, b: PayrollExpected): boolean =>
  a.gross === b.gross && a.totalDeductions === b.totalDeductions &&
  a.net === b.net && a.employerCost === b.employerCost;

function execute(c: PayrollCaseFile): PayrollCaseReport {
  const base = { id: c.id, expected: c.expected };
  try {
    const r = calculatePayslip(toInput(c), DEFAULT_PAYROLL_PACKS,
      c.overrides);
    const s = r.value;
    const actual = { gross: String(s.gross),
      totalDeductions: String(s.totalDeductions), net: String(s.net),
      employerCost: String(s.employerCost) };
    return { ...base, passed: same(actual, c.expected), actual,
      trace: r.trace };
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    return { ...base, passed: false, actual: `ERROR ${e.code}`, trace: [] };
  }
}

export async function runPayrollCases(dir: string):
  Promise<PayrollCaseReport[]> {
  const names = (await readdir(dir)).filter((n) => n.endsWith(".json"));
  const reports: PayrollCaseReport[] = [];
  for (const name of names.sort()) {
    const text = await readFile(join(dir, name), "utf8");
    reports.push(execute(parseCase(name, text)));
  }
  return reports;
}
