import { fils } from "../src/money";
import { loadPayrollParams } from "../src/payroll/params";
import type {
  AbsenceKind,
  GpssaInput,
  PayEmployee,
  PayslipInput,
} from "../src/payroll/types";
import { PAYROLL_PACKS } from "../src/rules/payroll-pack";

/** The shared fixture's params: the real pack, no overrides. */
export const P = loadPayrollParams(PAYROLL_PACKS[0]!, undefined);

export type FxPatch = Partial<Omit<PayslipInput, "employee">> & {
  employee?: Partial<PayEmployee>;
};

/** FX: expat, joined 2020-03-01, basic 10,000 plus 5,000 allowances. */
export function fx(patch: FxPatch = {}): PayslipInput {
  const { employee, ...top } = patch;
  return {
    year: 2026, month: 6,
    employee: {
      workerClass: "expat-full-time", joiningDate: "2020-03-01",
      leavingDate: null, probationEndDate: null, shiftWorker: false,
      normalHoursPerDay: 8, basicMonthly: fils(1000000n),
      allowances: [
        { code: "housing", kind: "housing", monthly: fils(400000n) },
        { code: "transport", kind: "conveyance", monthly: fils(100000n) },
      ],
      gpssa: null,
      ...employee,
    },
    absences: [], sickDaysUsedBefore: 0, maternityDaysUsedBefore: 0,
    overtime: [], restDayWork: [], encashLeaveDays: 0, deductions: [],
    loans: [],
    ...top,
  };
}

export function gpssaInput(patch: Partial<GpssaInput> = {}): GpssaInput {
  return { regime: "dl57-2023", fixingMonth: "2026-01",
    fixingBasic: fils(1000000n), fixingAllowances: fils(500000n),
    arrears: fils(0n), ...patch };
}

/** FX as a UAE national with the default GPSSA input. */
export function nationalFx(patch: FxPatch = {},
  g: Partial<GpssaInput> = {}): PayslipInput {
  return fx({ ...patch, employee: { workerClass: "uae-national",
    gpssa: gpssaInput(g), ...patch.employee } });
}

/** Every date from `from` to `to` (same month, day numbers). */
export function dates(ym: string, from: number, to: number): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d += 1) {
    out.push(`${ym}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export const absent = (kind: AbsenceKind, ds: string[]) =>
  ds.map((date) => ({ date, kind }));

export function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

export function detailOf(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (e) {
    return (e as { detail: Record<string, string> }).detail;
  }
  return {};
}
