import {
  add,
  daysBetween,
  EngineError,
  fils,
  type Fils,
} from "@payroll/engine";
import {
  defaultLayout,
  generateSif,
  validateSif,
  type EvpInput,
  type SifEmployee,
} from "@payroll/wps";
import {
  SIF_STATEMENT,
  type AppPayslip,
  type AppPayslipLine,
  type Company,
  type SifBucket,
} from "../contract";
import { periodEnd, periodStart } from "./dates";
import { MockFail } from "./fail";
import type { MockEmployee, MockSif } from "./seed-types";

export interface SifRequest {
  id: string;
  payRunId: string;
  company: Company;
  slips: readonly AppPayslip[];
  employees: readonly MockEmployee[];
  createdDate: string;
  /** HHMMSS in Dubai. */
  createdTime: string;
  createdAt: string;
  /** Enables the validator's future-date check. */
  today: string;
}

type Variable = Exclude<SifBucket, "fixed">;
const VARIABLE: readonly Variable[] = ["housing", "conveyance", "medical",
  "passage", "overtime", "otherAllowances", "leaveEncashment"];

const sumOf = (ls: readonly AppPayslipLine[]): Fils =>
  ls.reduce((s: Fils, l) => add(s, l.amount), fils(0n));

function evpFor(e: MockEmployee, lines: AppPayslipLine[]): EvpInput {
  const pick = (b: Variable) => sumOf(lines.filter((l) => l.sifBucket === b));
  const parts = Object.fromEntries(VARIABLE.map((b) => [b, pick(b)]));
  return { personId: e.labourPersonId ?? "",
    routingCode: e.bank?.routingCode ?? "",
    ...(parts as Record<Variable, Fils>) };
}

function employeeFor(slip: AppPayslip, e: MockEmployee): SifEmployee {
  const start = e.joiningDate > periodStart(slip.period) ? e.joiningDate
    : periodStart(slip.period);
  const lastDay = e.lastWorkingDate ?? periodEnd(slip.period);
  const end = lastDay < periodEnd(slip.period) ? lastDay
    : periodEnd(slip.period);
  const fixed = sumOf(slip.lines.filter((l) => l.sifBucket === "fixed"));
  const rest = slip.lines.filter((l) => l.sifBucket !== "fixed");
  const variable = sumOf(rest);
  const edr = { personId: e.labourPersonId ?? "",
    routingCode: e.bank?.routingCode ?? "", account: e.iban ?? "",
    payStart: start, payEnd: end, days: daysBetween(start, end) + 1,
    fixed, variable, unpaidLeaveDays: 0 };
  return variable > 0n ? { edr, evp: evpFor(e, rest) } : { edr };
}

function checkInputs(r: SifRequest): Map<string, MockEmployee> {
  const { employerId, bankRoutingCode } = r.company.wps;
  if (employerId === null || bankRoutingCode === null) {
    throw new MockFail("COMPANY_WPS_SETTINGS_MISSING",
      "company WPS settings are not set");
  }
  const byId = new Map(r.employees.map((e) => [e.id, e]));
  const missing = r.slips.map((s) => s.employeeId)
    .filter((id) => (byId.get(id)?.iban ?? null) === null);
  if (missing.length > 0) {
    throw new MockFail("EMPLOYEE_BANK_MISSING",
      "some employees have no bank details", { employeeIds: missing });
  }
  return byId;
}

/** Builds the file with the wps package, then checks it with it too. */
export function buildSif(r: SifRequest): MockSif {
  const byId = checkInputs(r);
  const employees = r.slips.map((s) =>
    employeeFor(s, byId.get(s.employeeId) as MockEmployee));
  const period = r.slips[0]?.period ?? { year: 2000, month: 1 };
  let result;
  try {
    result = generateSif({ employerId: r.company.wps.employerId ?? "",
      bankRoutingCode: r.company.wps.bankRoutingCode ?? "",
      createdDate: r.createdDate, createdTime: r.createdTime,
      month: period, employees });
  } catch (e) {
    if (!(e instanceof EngineError)) throw e;
    throw new MockFail("SIF_GENERATION_FAILED", e.message,
      { engineCode: e.code });
  }
  const findings = validateSif(result.text, defaultLayout, r.today)
    .map((f) => ({ ...f }));
  const count = (s: string) => findings.filter((f) => f.severity === s)
    .length;
  return { text: result.text, file: { id: r.id, payRunId: r.payRunId,
    fileName: result.fileName, total: result.total,
    createdAt: r.createdAt, findings, errorCount: count("error"),
    warningCount: count("warning"), statement: SIF_STATEMENT } };
}
