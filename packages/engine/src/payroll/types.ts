import type { WorkerClass } from "../gratuity";
import type { Fils } from "../money";
import type { GpssaRegime } from "./params";

export type AllowanceKind =
  "housing" | "conveyance" | "medical" | "passage" | "other";
export interface Allowance { code: string; kind: AllowanceKind;
  monthly: Fils }
export type AbsenceKind = "unpaid" | "sick" | "maternity";
export interface Absence { date: string; kind: AbsenceKind }
export interface OvertimeEntry { date: string; minutes: number;
  nightMinutes: number }
export interface RestDayWork { date: string;
  kind: "rest-day" | "holiday"; compensation: "pay" | "day-off" }
export type DeductionKind =
  "overpayment" | "violation" | "damage" | "court-debt" | "scheme";
export interface DeductionRequest { ref: string; kind: DeductionKind;
  amount: Fils; consentOnFile: boolean }
export interface LoanInstalment { ref: string; instalment: Fils;
  balance: Fils; consentOnFile: boolean }
/**
 * The GPSSA employee share uses ref "gpssa". `arrears` is employee share
 * deferred in earlier months (Ruling 17), 0 when none.
 */
export interface GpssaInput { regime: GpssaRegime;
  fixingMonth: string; fixingBasic: Fils; fixingAllowances: Fils;
  arrears: Fils }
export interface PayEmployee { workerClass: WorkerClass;
  joiningDate: string; leavingDate: string | null;
  probationEndDate: string | null; shiftWorker: boolean;
  normalHoursPerDay: number; basicMonthly: Fils;
  allowances: Allowance[]; gpssa: GpssaInput | null }
/** `encashLeaveDays` 0 means no encashment. */
export interface PayslipInput { year: number; month: number;
  employee: PayEmployee; absences: Absence[];
  sickDaysUsedBefore: number; maternityDaysUsedBefore: number;
  overtime: OvertimeEntry[]; restDayWork: RestDayWork[];
  encashLeaveDays: number; deductions: DeductionRequest[];
  loans: LoanInstalment[] }
export type EarningKind = "basic" | AllowanceKind | "overtime" |
  "rest-day" | "holiday" | "leave-encashment";
export type DeductionLineKind = "gpssa" | DeductionKind | "loan";
export interface PayslipLine<K extends string = string> {
  traceId: string; kind: K; label: string; amount: Fils }
export interface DeferredDeduction { ref: string;
  kind: DeductionLineKind; requested: Fils; taken: Fils;
  deferred: Fils; reason: "kind-cap" | "overall-cap" }
export interface LoanBalance { ref: string; before: Fils; after: Fils }
export interface PayslipFlag { code: string; message: string;
  detail: Record<string, string> }
export interface PayWindow { year: number; month: number;
  daysInMonth: number; monthStart: string; monthEnd: string;
  payStart: string; payEnd: string }
export interface Payslip { year: number; month: number;
  workerClass: WorkerClass; payStart: string; payEnd: string;
  daysInPeriod: number; unpaidDays: number;
  earnings: PayslipLine<EarningKind>[];
  deductions: PayslipLine<DeductionLineKind>[];
  employerCosts: PayslipLine<"gpssa-employer">[];
  gross: Fils; totalDeductions: Fils; net: Fils; employerCost: Fils;
  caps: { wageBase: Fils; overall: Fils };
  deferred: DeferredDeduction[]; loanBalances: LoanBalance[];
  flags: PayslipFlag[]; notComputed: string[];
  notApplicable: string[] }
