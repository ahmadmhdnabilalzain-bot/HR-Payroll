import type { LeavePolicy, LeavePolicyPut } from "@payroll/contract";
import { checkLeavePolicy } from "@payroll/engine";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { timeParams } from "../time/params";
import { loadLeaveType } from "./balances";

interface PolicyRow { payroll_kind: LeavePolicy["payrollKind"];
  accrual: LeavePolicy["accrual"]; joining_year_pro_rata: boolean;
  day_count: LeavePolicy["dayCount"]; half_days: boolean;
  carry_over_max_halves: number | null;
  carry_over_expires_months: number | null; min_notice_days: number;
  max_consecutive_days: number | null; allow_negative: boolean }

type Fields = Omit<LeavePolicy, "leaveTypeId" | "isDefault" | "warnings">;

/** Plan 3's behaviour: calendar days, upfront, nothing else. */
const defaults = (paid: boolean): Fields => ({
  payrollKind: paid ? "other-paid" : "unpaid", accrual: "upfront",
  joiningYearProRata: false, dayCount: "calendar", halfDays: false,
  carryOverMaxDays: null, carryOverExpiresMonths: null, minNoticeDays: 0,
  maxConsecutiveDays: null, allowNegative: false });

const fromRow = (r: PolicyRow): Fields => ({ payrollKind: r.payroll_kind,
  accrual: r.accrual, joiningYearProRata: r.joining_year_pro_rata,
  dayCount: r.day_count, halfDays: r.half_days,
  carryOverMaxDays: r.carry_over_max_halves === null ? null
    : r.carry_over_max_halves / 2,
  carryOverExpiresMonths: r.carry_over_expires_months,
  minNoticeDays: r.min_notice_days,
  maxConsecutiveDays: r.max_consecutive_days,
  allowNegative: r.allow_negative });

/** The policy row or the default, with the engine's warnings. */
export async function loadPolicy(tx: Db, companyId: string,
  leaveTypeId: string, today: string): Promise<LeavePolicy> {
  const type = await loadLeaveType(tx, companyId, leaveTypeId);
  const [r] = await tx.query<PolicyRow>(
    `SELECT * FROM leave_policies WHERE company_id = $1
     AND leave_type_id = $2`, [companyId, leaveTypeId]);
  const f = r === undefined ? defaults(type.paid) : fromRow(r);
  const warnings = checkLeavePolicy({ payrollKind: f.payrollKind,
    annualDays: type.annual_days, accrual: f.accrual,
    dayCount: f.dayCount, carryOverMaxDays: f.carryOverMaxDays },
  timeParams(today));
  return { leaveTypeId, ...f, isDefault: r === undefined, warnings };
}

/**
 * The type's `paid` flag decides Plan 3's pay-run deduction and the
 * policy's payroll kind decides Plan 9's pay inputs, so they must
 * agree: "unpaid" exactly when the type is unpaid (review N7).
 */
export function assertKindMatchesPaid(kind: LeavePolicy["payrollKind"],
  paid: boolean): void {
  if ((kind === "unpaid") === paid) {
    throw new ApiError("LEAVE_POLICY_INVALID", "the payroll kind must be " +
      "unpaid exactly when the leave type is unpaid",
    { fields: ["payrollKind", "paid"] });
  }
}

/** A change of `paid` must still agree with a stored policy. */
export async function assertPaidChange(tx: Db, companyId: string,
  leaveTypeId: string, paid: boolean): Promise<void> {
  const [r] = await tx.query<{ payroll_kind: LeavePolicy["payrollKind"] }>(
    "SELECT payroll_kind FROM leave_policies WHERE company_id = $1 " +
    "AND leave_type_id = $2", [companyId, leaveTypeId]);
  if (r !== undefined) assertKindMatchesPaid(r.payroll_kind, paid);
}

/**
 * Carry-over needs a type that keeps a balance (422
 * LEAVE_POLICY_INVALID). Existing requests are never rewritten.
 */
export async function putPolicy(tx: Db, companyId: string,
  leaveTypeId: string, b: LeavePolicyPut, at: string)
  : Promise<LeavePolicy> {
  const type = await loadLeaveType(tx, companyId, leaveTypeId);
  assertKindMatchesPaid(b.payrollKind, type.paid);
  if (b.carryOverMaxDays !== null && type.annual_days === null) {
    throw new ApiError("LEAVE_POLICY_INVALID", "carry-over needs a type " +
      "that keeps a balance", { fields: ["body.carryOverMaxDays"] });
  }
  await tx.query(
    `INSERT INTO leave_policies (company_id, leave_type_id, payroll_kind,
       accrual, joining_year_pro_rata, day_count, half_days,
       carry_over_max_halves, carry_over_expires_months, min_notice_days,
       max_consecutive_days, allow_negative, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (leave_type_id) DO UPDATE SET payroll_kind = $3,
       accrual = $4, joining_year_pro_rata = $5, day_count = $6,
       half_days = $7, carry_over_max_halves = $8,
       carry_over_expires_months = $9, min_notice_days = $10,
       max_consecutive_days = $11, allow_negative = $12, updated_at = $13`,
    [companyId, leaveTypeId, b.payrollKind, b.accrual,
      b.joiningYearProRata, b.dayCount, b.halfDays,
      b.carryOverMaxDays === null ? null : b.carryOverMaxDays * 2,
      b.carryOverExpiresMonths, b.minNoticeDays, b.maxConsecutiveDays,
      b.allowNegative, at]);
  return loadPolicy(tx, companyId, leaveTypeId, at.slice(0, 10));
}
