import type {
  ErrorCode,
  LeavePolicy,
  LeaveRequestCreate,
  LeaveWarning,
} from "@payroll/contract";
import { daysBetween, type LeaveCount } from "@payroll/engine";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { loadLeaveType } from "./balances";
import { blackoutHits } from "./blackouts";
import { countLeave, leaveCalendar, overlapDates } from "./leave-calendar";
import { loadPolicy } from "./policy";
import { policyBalance } from "./policy-balance";
import { staffingWarning } from "./staffing-hook";

export interface RequestPlan {
  policy: LeavePolicy;
  count: LeaveCount;
  warnings: LeaveWarning[];
  blocked: { code: ErrorCode; dates: string[] } | null;
  overridden: boolean;
  balanceAfter: number | null;
}

const warn = (code: LeaveWarning["code"], message: string,
  dates: string[]): LeaveWarning => ({ code, message, dates });

function policyWarnings(p: LeavePolicy, b: LeaveRequestCreate,
  c: LeaveCount, today: string): LeaveWarning[] {
  const out: LeaveWarning[] = [];
  if (daysBetween(today, b.startDate) < p.minNoticeDays) {
    out.push(warn("SHORT_NOTICE", "Less notice than the policy asks",
      [b.startDate]));
  }
  const span = daysBetween(b.startDate, b.endDate) + 1;
  if (p.maxConsecutiveDays !== null && span > p.maxConsecutiveDays) {
    out.push(warn("OVER_MAX_CONSECUTIVE", "Longer than the policy's " +
      "maximum in a row", [b.startDate, b.endDate]));
  }
  const hol = c.skipped.filter((x) => x.why === "holiday").map((x) => x.date);
  if (hol.length > 0) {
    out.push(warn("HOLIDAYS_EXCLUDED", "Company holidays are not counted",
      hol));
  }
  return out;
}

/** Blocking blackouts, unless owner or hr asked to override. */
async function blackouts(tx: Db, t: Tenant, emp: string,
  b: LeaveRequestCreate, c: LeaveCount) {
  const hits = await blackoutHits(tx, t.companyId, emp, b.leaveTypeId,
    c.dates.map((x) => x.date));
  const blockDates = hits.filter((h) => h.mode === "block")
    .flatMap((h) => h.dates);
  const warnDates = hits.filter((h) => h.mode === "warn")
    .flatMap((h) => h.dates);
  const canOverride = (t.role === "owner" || t.role === "hr") &&
    b.overrideBlackout === true;
  const warnings = warnDates.length === 0 ? [] : [warn("BLACKOUT_WARN",
    "Inside a company blackout period", [...new Set(warnDates)])];
  if (blockDates.length > 0 && canOverride) {
    warnings.push(warn("BLACKOUT_OVERRIDDEN", "Booked through a blocking " +
      "blackout by owner or hr", [...new Set(blockDates)]));
  }
  return { warnings, overridden: blockDates.length > 0 && canOverride,
    blocked: blockDates.length > 0 && !canOverride
      ? [...new Set(blockDates)] : null };
}

/**
 * Every Plan 9 rule of a request, without writing: parts, counting,
 * overlap by halves, blackouts, warnings and the balance as of the
 * start date. The first blocking problem is returned, not thrown.
 */
export async function planRequest(tx: Db, t: Tenant, emp: string,
  b: LeaveRequestCreate, today: string): Promise<RequestPlan> {
  const type = await loadLeaveType(tx, t.companyId, b.leaveTypeId);
  const policy = await loadPolicy(tx, t.companyId, type.id, today);
  const half = (b.startPart ?? "full") !== "full" ||
    (b.endPart ?? "full") !== "full";
  if (half && !policy.halfDays) throw new ApiError("HALF_DAY_NOT_ALLOWED");
  const cal = await leaveCalendar(tx, t.companyId, emp, b.startDate,
    b.endDate, policy.dayCount);
  const count = countLeave(b, policy.dayCount, cal);
  const bo = await blackouts(tx, t, emp, b, count);
  const warnings = [...policyWarnings(policy, b, count, today),
    ...bo.warnings, ...await staffingWarning(tx, t.companyId, emp,
      count.dates.map((x) => x.date))];
  const plan: RequestPlan = { policy, count, warnings, blocked: null,
    overridden: bo.overridden, balanceAfter: null };
  if (count.halves === 0) return { ...plan, blocked: { code:
    "LEAVE_ZERO_DAYS", dates: [] } };
  const taken = await overlapDates(tx, t.companyId, emp, count);
  if (taken.length > 0) return { ...plan, blocked: { code: "LEAVE_OVERLAP",
    dates: taken } };
  if (bo.blocked !== null) return { ...plan, blocked: { code:
    "LEAVE_BLACKOUT", dates: bo.blocked } };
  if (type.annual_days === null) return plan;
  const bal = await policyBalance(tx, t.companyId, emp, type.id,
    Number(b.startDate.slice(0, 4)), b.startDate);
  const after = bal.availableHalves - count.halves;
  plan.balanceAfter = after / 2;
  if (after < 0 && !policy.allowNegative) {
    return { ...plan, blocked: { code: "INSUFFICIENT_BALANCE", dates: [] } };
  }
  return plan;
}
