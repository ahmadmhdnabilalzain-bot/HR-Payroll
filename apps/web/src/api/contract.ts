/**
 * The only file that imports @payroll/contract. Wire money (the
 * string "1234.00") is converted to Fils here and nowhere else; the
 * rest of the app sees `App<Name>` types with Fils amounts.
 */
import {
  type EmployeeView,
  type PayRun,
  type PayRunCreate,
  type PayRunEntry,
  type Payslip,
  type PayslipLine,
  type ReimbursementLine,
  type SalaryComponent,
  type Settlement,
  type SifFile,
} from "@payroll/contract";
import { parseAed, type Fils } from "@payroll/engine";

export {
  ApiErrorBody,
  ERROR_CODES,
  ERROR_STATUS,
  EXAMPLE_IDS,
  EXAMPLES,
  IBAN_SENTINEL,
  NOT_COMPUTED_PAY,
  ROUTES,
  routeById,
  SIF_STATEMENT,
} from "@payroll/contract";
export type {
  AttendanceQuery,
  AttendanceRecord,
  AuditEvent,
  AuditVerifyResult,
  BankDetails,
  BankMasked,
  Company,
  CompanyUpdate,
  CompanyUser,
  Department,
  ErrorCode,
  ErrorDetail as WireErrorDetail,
  Finding,
  InviteRequest,
  InviteResponse,
  LeaveBalance,
  LeaveDecision,
  LeaveRequest,
  LeaveRequestCreate,
  LeaveType,
  LoginRequest,
  LoginResponse,
  Me,
  Membership,
  MfaEnrolResponse,
  PayRunProblem,
  Period,
  Role,
  RouteDef,
  RuleStatus,
  SifBucket,
  TraceLine,
  TraceRule,
  User,
  WorkerClass,
} from "@payroll/contract";
/** Wire shapes, for adapters that hold validated bodies. */
export type {
  AuditEventPage as WireAuditPage,
  CompanyUser as WireCompanyUser,
  EmployeeView as WireEmployee,
  PayRun as WirePayRun,
  PayRunCreate as WirePayRunCreate,
  Payslip as WirePayslip,
  SifFile as WireSifFile,
} from "@payroll/contract";

type Money<T, K extends keyof T> = Omit<T, K> & { [P in K]: Fils };

export type AppSalaryComponent = Money<SalaryComponent, "amount">;
export type AppEmployee = Omit<EmployeeView, "salary"> & {
  salary: AppSalaryComponent[] | null;
};
export type AppPayRun = Money<PayRun, "gross" | "reimbursementTotal">;
export type AppReimbursementLine = Money<ReimbursementLine, "amount">;
export type AppPayslipLine = Money<PayslipLine, "amount">;
type Computed = Extract<Settlement, { status: "computed" }>;
export type AppSettlement =
  | Money<Computed, "gratuity" | "leavePay" | "total">
  | Extract<Settlement, { status: "refused" }>;
type SlipMoney = "gross" | "net" | "salaryNet" | "reimbursementTotal";
export type AppPayslip = Omit<
  Money<Payslip, SlipMoney>, "lines" | "settlement" | "reimbursements"
> & { lines: AppPayslipLine[]; settlement: AppSettlement | null;
  reimbursements: AppReimbursementLine[] };
export type AppSifFile = Money<SifFile, "total">;

type Override = { code: string; amount: Fils };
type OneOff = NonNullable<PayRunEntry["oneOffs"]>[number];
export type AppPayRunEntry = {
  employeeId: string;
  componentOverrides?: Override[];
  oneOffs?: (Omit<OneOff, "amount"> & { amount: Fils })[];
  unusedLeaveDays?: number;
};
export type AppPayRunCreate = {
  period: PayRunCreate["period"];
  entries: AppPayRunEntry[];
};

/** Wire money to Fils; a malformed string throws INVALID_AMOUNT. */
export function fromWireMoney(m: string): Fils {
  if (!/^\d{1,9}\.\d{2}$/.test(m)) {
    throw new Error(`INVALID_AMOUNT: not wire money: "${m}"`);
  }
  return parseAed(m);
}

/** Fils to wire money, two decimals; negative throws. */
export function toWireMoney(f: Fils): string {
  if (f < 0n) {
    throw new Error(`NEGATIVE_AMOUNT: ${f.toString()} fils`);
  }
  const frac = (f % 100n).toString().padStart(2, "0");
  return `${(f / 100n).toString()}.${frac}`;
}

const from = fromWireMoney;
const to = toWireMoney;

export function fromWireEmployee(w: EmployeeView): AppEmployee {
  const salary = w.salary?.map((c) => ({ ...c, amount: from(c.amount) }));
  return { ...w, salary: salary ?? null };
}

export function toWireEmployee(a: AppEmployee): EmployeeView {
  const salary = a.salary?.map((c) => ({ ...c, amount: to(c.amount) }));
  return { ...a, salary: salary ?? null };
}

export const fromWirePayRun = (w: PayRun): AppPayRun =>
  ({ ...w, gross: from(w.gross),
    reimbursementTotal: from(w.reimbursementTotal) });
export const toWirePayRun = (a: AppPayRun): PayRun =>
  ({ ...a, gross: to(a.gross), reimbursementTotal: to(a.reimbursementTotal) });
export const fromWireSifFile = (w: SifFile): AppSifFile =>
  ({ ...w, total: from(w.total) });
export const toWireSifFile = (a: AppSifFile): SifFile =>
  ({ ...a, total: to(a.total) });

export function fromWireSettlement(w: Settlement): AppSettlement {
  if (w.status === "refused") return w;
  return { ...w, gratuity: from(w.gratuity), leavePay: from(w.leavePay),
    total: from(w.total) };
}

export function toWireSettlement(a: AppSettlement): Settlement {
  if (a.status === "refused") return a;
  return { ...a, gratuity: to(a.gratuity), leavePay: to(a.leavePay),
    total: to(a.total) };
}

export function fromWirePayslip(w: Payslip): AppPayslip {
  return {
    ...w,
    gross: from(w.gross),
    net: from(w.net),
    salaryNet: from(w.salaryNet),
    reimbursementTotal: from(w.reimbursementTotal),
    reimbursements: w.reimbursements.map((r) => ({ ...r,
      amount: from(r.amount) })),
    lines: w.lines.map((l) => ({ ...l, amount: from(l.amount) })),
    settlement: w.settlement === null ? null
      : fromWireSettlement(w.settlement),
  };
}

export function toWirePayslip(a: AppPayslip): Payslip {
  return {
    ...a,
    gross: to(a.gross),
    net: to(a.net),
    salaryNet: to(a.salaryNet),
    reimbursementTotal: to(a.reimbursementTotal),
    reimbursements: a.reimbursements.map((r) => ({ ...r,
      amount: to(r.amount) })),
    lines: a.lines.map((l) => ({ ...l, amount: to(l.amount) })),
    settlement: a.settlement === null ? null
      : toWireSettlement(a.settlement),
  };
}

function toWireEntry(e: AppPayRunEntry): PayRunEntry {
  const out: PayRunEntry = { employeeId: e.employeeId };
  if (e.componentOverrides !== undefined) {
    out.componentOverrides = e.componentOverrides
      .map((o) => ({ code: o.code, amount: to(o.amount) }));
  }
  if (e.oneOffs !== undefined) {
    out.oneOffs = e.oneOffs.map((o) => ({ ...o, amount: to(o.amount) }));
  }
  if (e.unusedLeaveDays !== undefined) {
    out.unusedLeaveDays = e.unusedLeaveDays;
  }
  return out;
}

export function toWirePayRunCreate(a: AppPayRunCreate): PayRunCreate {
  return { period: a.period, entries: a.entries.map(toWireEntry) };
}

function fromWireEntry(e: PayRunEntry): AppPayRunEntry {
  const out: AppPayRunEntry = { employeeId: e.employeeId };
  if (e.componentOverrides !== undefined) {
    out.componentOverrides = e.componentOverrides
      .map((o) => ({ code: o.code, amount: from(o.amount) }));
  }
  if (e.oneOffs !== undefined) {
    out.oneOffs = e.oneOffs.map((o) => ({ ...o, amount: from(o.amount) }));
  }
  if (e.unusedLeaveDays !== undefined) {
    out.unusedLeaveDays = e.unusedLeaveDays;
  }
  return out;
}

export function fromWirePayRunCreate(w: PayRunCreate): AppPayRunCreate {
  return { period: w.period, entries: w.entries.map(fromWireEntry) };
}
