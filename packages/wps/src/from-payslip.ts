import {
  EngineError,
  fils,
  type EarningKind,
  type Fils,
  type Payslip,
} from "@payroll/engine";
import type { SifEmployee } from "./generate";

export interface SifBankDetails { personId: string;
  routingCode: string; account: string }

type Bucket = "fixed" | "housing" | "conveyance" | "medical" | "passage" |
  "overtime" | "otherAllowances" | "leaveEncashment";

const BUCKET: Record<EarningKind, Bucket> = {
  basic: "fixed", housing: "housing", conveyance: "conveyance",
  medical: "medical", passage: "passage", other: "otherAllowances",
  overtime: "overtime", "rest-day": "overtime", holiday: "overtime",
  "leave-encashment": "leaveEncashment",
};

/** Deductions come off the buckets in this order (Ruling 19). */
const TAKE_ORDER: readonly Bucket[] = ["fixed", "otherAllowances",
  "overtime", "leaveEncashment", "passage", "medical", "conveyance",
  "housing"];

const EVP_PARTS: readonly Bucket[] = ["housing", "conveyance", "medical",
  "passage", "overtime", "otherAllowances", "leaveEncashment"];

function buckets(slip: Payslip): Record<Bucket, bigint> {
  const b = Object.fromEntries(TAKE_ORDER.map((k) => [k, 0n])) as
    Record<Bucket, bigint>;
  for (const e of slip.earnings) b[BUCKET[e.kind]] += e.amount;
  let left: bigint = slip.totalDeductions;
  for (const k of TAKE_ORDER) {
    const take = left < b[k] ? left : b[k];
    b[k] -= take;
    left -= take;
  }
  return b;
}

/**
 * A payslip as one SIF employee: fixed is the earned basic after
 * deductions, variable everything else, itemised in the EVP, so fixed
 * plus variable is net pay.
 */
export function payslipToSifEmployee(slip: Payslip,
  bank: SifBankDetails): SifEmployee {
  const b = buckets(slip);
  const part = (k: Bucket): Fils => fils(b[k]);
  const variable = fils(EVP_PARTS.reduce((s, k) => s + b[k], 0n));
  const fixed = part("fixed");
  if (fixed + variable !== slip.net) {
    throw new EngineError("ADAPTER_MISMATCH",
      "fixed plus variable pay does not equal net pay",
      { value: String(fixed + variable), net: String(slip.net) });
  }
  const edr = { ...bank, payStart: slip.payStart, payEnd: slip.payEnd,
    days: slip.daysInPeriod, fixed, variable,
    unpaidLeaveDays: slip.unpaidDays };
  if (variable === 0n) return { edr };
  const evp = { personId: bank.personId, routingCode: bank.routingCode,
    housing: part("housing"), conveyance: part("conveyance"),
    medical: part("medical"), passage: part("passage"),
    overtime: part("overtime"), otherAllowances: part("otherAllowances"),
    leaveEncashment: part("leaveEncashment") };
  return { edr, evp };
}
