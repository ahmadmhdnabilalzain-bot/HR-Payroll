import type { EmiratisationEmployee, NotCountedReason } from "./types";

/** Joined on or before asOf and not yet past the last working date. */
export function activeOn(e: EmiratisationEmployee, asOf: string): boolean {
  const joined = e.joiningDate <= asOf;
  const stays = e.lastWorkingDate === null || e.lastWorkingDate >= asOf;
  return joined && stays;
}

function belowWage(e: EmiratisationEmployee, asOf: string,
  minWage: bigint, countingFrom: string): boolean {
  if (asOf < countingFrom) return false;
  return e.monthlyWage === null || e.monthlyWage < minWage;
}

/**
 * Why a national does not count; empty means counted. Any counting flag
 * not entered gives only "flags-not-entered".
 */
export function notCountedReasons(
  e: EmiratisationEmployee,
  asOf: string,
  minWage: bigint,
  countingFrom: string,
): NotCountedReason[] {
  const flags = [e.workPermitValid, e.paidViaWps, e.gpssaRegistered];
  if (flags.includes(null)) return ["flags-not-entered"];
  const reasons: NotCountedReason[] = [];
  if (e.workPermitValid === false) reasons.push("work-permit-not-valid");
  if (e.paidViaWps === false) reasons.push("not-paid-via-wps");
  if (e.gpssaRegistered === false) reasons.push("not-gpssa-registered");
  if (belowWage(e, asOf, minWage, countingFrom)) {
    reasons.push("below-minimum-wage");
  }
  return reasons;
}
