import type {
  ExpenseItemInput,
  ExpensePolicy,
  Role,
} from "@payroll/contract";
import { fils, parseAed, type Fils } from "@payroll/engine";

/**
 * Pure pricing and limit lookup. Mileage and per diem rates are
 * company policy values with no default; whole kilometres and whole
 * days, so no rounding exists.
 */
export interface LimitF {
  categoryId: string;
  role: Role | null;
  perItemMax: Fils | null;
  monthlyMax: Fils | null;
  receiptRequiredAbove: Fils | null;
  overLimit: "block" | "flag";
}

export interface MileageRateF {
  code: string;
  label: string;
  perKm: Fils;
  effectiveFrom: string;
}

export interface PerDiemRateF {
  code: string;
  label: string;
  labelAr: string | null;
  daily: Fils;
  effectiveFrom: string;
}

export interface PolicyF {
  version: number;
  claimWindowDays: number | null;
  limits: LimitF[];
  mileageRates: MileageRateF[];
  perDiemRates: PerDiemRateF[];
}

export type Priced =
  | { ok: true; amount: Fils; vatAmount: Fils; rateApplied: Fils | null }
  | { ok: false; code: "RATE_NOT_FOUND" };

const opt = (m: string | null) => (m === null ? null : parseAed(m));

/** The wire policy with amounts in fils. */
export function toPolicyF(p: ExpensePolicy): PolicyF {
  return { version: p.version, claimWindowDays: p.claimWindowDays,
    limits: p.limits.map((l) => ({ ...l, perItemMax: opt(l.perItemMax),
      monthlyMax: opt(l.monthlyMax),
      receiptRequiredAbove: opt(l.receiptRequiredAbove) })),
    mileageRates: p.mileageRates.map((r) => ({ ...r,
      perKm: parseAed(r.perKm) })),
    perDiemRates: p.perDiemRates.map((r) => ({ ...r,
      daily: parseAed(r.daily) })) };
}

/** The rate with this code and the latest `effectiveFrom <= date`. */
export function pickRate<R extends { code: string; effectiveFrom: string }>(
  rates: R[], code: string, date: string): R | null {
  let best: R | null = null;
  for (const r of rates) {
    if (r.code !== code || r.effectiveFrom > date) continue;
    if (best === null || r.effectiveFrom > best.effectiveFrom) best = r;
  }
  return best;
}

const ZERO = fils(0n);

export function priceItem(item: ExpenseItemInput, p: PolicyF): Priced {
  if (item.kind === "receipt") {
    return { ok: true, amount: parseAed(item.amount),
      vatAmount: parseAed(item.vatAmount), rateApplied: null };
  }
  if (item.kind === "mileage") {
    const r = pickRate(p.mileageRates, item.rateCode, item.date);
    if (r === null) return { ok: false, code: "RATE_NOT_FOUND" };
    return { ok: true, amount: fils(BigInt(item.distanceKm) * r.perKm),
      vatAmount: ZERO, rateApplied: r.perKm };
  }
  const r = pickRate(p.perDiemRates, item.rateCode, item.date);
  if (r === null) return { ok: false, code: "RATE_NOT_FOUND" };
  return { ok: true, amount: fils(BigInt(item.days) * r.daily),
    vatAmount: ZERO, rateApplied: r.daily };
}

/** The role's own row wins over the `role: null` default row. */
export function limitFor(p: PolicyF, categoryId: string, role: Role)
  : LimitF | null {
  const rows = p.limits.filter((l) => l.categoryId === categoryId);
  return rows.find((l) => l.role === role) ??
    rows.find((l) => l.role === null) ?? null;
}
