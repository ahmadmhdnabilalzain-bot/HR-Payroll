import type {
  ClaimFlagCode,
  ClaimProblemCode,
  ExpenseKind,
  Role,
} from "@payroll/contract";
import { daysBetween, type Fils } from "@payroll/engine";
import type { LimitF } from "./policy";

/**
 * Pure policy checks at submit. Every problem is reported, not the
 * first only. Problems block; flags inform the approver.
 */
export interface CheckItem {
  index: number;
  categoryId: string;
  kind: ExpenseKind;
  date: string;
  amount: Fils;
  vatAmount: Fils;
  supplierTrn: string | null;
  receiptCount: number;
  receiptHashes: string[];
  justification: string | null;
  originalCurrency: string | null;
  priced: boolean;
}

export interface CheckInput {
  items: CheckItem[];
  role: Role;
  today: string;
  joiningDate: string;
  claimWindowDays: number | null;
  categories: ReadonlyMap<string, { kind: ExpenseKind; active: boolean }>;
  limits: (categoryId: string) => LimitF | null;
  /** Keys `"<categoryId>|YYYY-MM"`: the employee's other claims. */
  monthToDate: ReadonlyMap<string, Fils>;
  /** `"<categoryId>|<date>|<fils>"` of the employee's other claims. */
  otherSignatures: ReadonlySet<string>;
  otherHashes: ReadonlySet<string>;
  /**
   * Receipt hashes on other employees' claims: flagged only as a
   * possible duplicate, so the other person is never named.
   */
  companyHashes: ReadonlySet<string>;
}

export interface Flag { code: ClaimFlagCode; index: number | null }

export interface CheckResult {
  problems: string[];
  flags: Flag[];
  overLimitIndexes: number[];
}

type Codes = ClaimProblemCode[];

function basicProblems(it: CheckItem, i: CheckInput): Codes {
  const out: Codes = [];
  const cat = i.categories.get(it.categoryId);
  if (cat === undefined) out.push("CATEGORY_NOT_FOUND");
  else {
    if (!cat.active) out.push("CATEGORY_INACTIVE");
    if (cat.kind !== it.kind) out.push("CATEGORY_KIND_MISMATCH");
  }
  if (!it.priced) out.push("RATE_NOT_FOUND");
  if (it.date > i.today) out.push("EXPENSE_DATE_IN_FUTURE");
  if (it.date < i.joiningDate) out.push("EXPENSE_BEFORE_JOINING");
  if (i.claimWindowDays !== null && it.date <= i.today &&
    daysBetween(it.date, i.today) > i.claimWindowDays) {
    out.push("EXPENSE_TOO_OLD");
  }
  if (it.vatAmount > it.amount) out.push("VAT_EXCEEDS_AMOUNT");
  const l = i.limits(it.categoryId);
  if (l?.receiptRequiredAbove != null && it.amount > l.receiptRequiredAbove
    && it.receiptCount === 0) out.push("RECEIPT_REQUIRED");
  return out;
}

const monthKey = (it: CheckItem) => `${it.categoryId}|${it.date.slice(0, 7)}`;

/** Per-item and running monthly totals against the limit row. */
function isOver(it: CheckItem, l: LimitF, running: Map<string, Fils>,
  i: CheckInput): boolean {
  const key = monthKey(it);
  const sum = (running.get(key) ?? i.monthToDate.get(key) ?? 0n) +
    it.amount;
  running.set(key, sum as Fils);
  return (l.perItemMax !== null && it.amount > l.perItemMax) ||
    (l.monthlyMax !== null && sum > l.monthlyMax);
}

function dupFlags(it: CheckItem, i: CheckInput, sigs: Set<string>,
  hashes: Set<string>): ClaimFlagCode[] {
  const out: ClaimFlagCode[] = [];
  const sig = `${it.categoryId}|${it.date}|${it.amount}`;
  if (i.otherSignatures.has(sig) || sigs.has(sig)) {
    out.push("POSSIBLE_DUPLICATE");
  }
  if (it.receiptHashes.some((h) => i.otherHashes.has(h) || hashes.has(h))) {
    out.push("DUPLICATE_RECEIPT");
  } else if (!out.includes("POSSIBLE_DUPLICATE") &&
    it.receiptHashes.some((h) => i.companyHashes.has(h))) {
    out.push("POSSIBLE_DUPLICATE");
  }
  sigs.add(sig);
  for (const h of it.receiptHashes) hashes.add(h);
  return out;
}

function infoFlags(it: CheckItem): ClaimFlagCode[] {
  const out: ClaimFlagCode[] = [];
  if (it.vatAmount > 0n && it.supplierTrn === null) {
    out.push("VAT_WITHOUT_TRN");
  }
  if (it.originalCurrency !== null && it.originalCurrency !== "AED") {
    out.push("FOREIGN_CURRENCY");
  }
  return out;
}

interface Acc extends CheckResult {
  running: Map<string, Fils>;
  sigs: Set<string>;
  hashes: Set<string>;
}

function checkItem(it: CheckItem, i: CheckInput, acc: Acc): void {
  const codes = basicProblems(it, i);
  const flags: ClaimFlagCode[] = [];
  const l = i.categories.has(it.categoryId) ? i.limits(it.categoryId)
    : null;
  if (l !== null && isOver(it, l, acc.running, i)) {
    if (l.overLimit === "block") codes.push("EXPENSE_OVER_LIMIT");
    else {
      flags.push("OVER_LIMIT");
      acc.overLimitIndexes.push(it.index);
      if (it.justification === null) codes.push("JUSTIFICATION_REQUIRED");
    }
  }
  flags.push(...dupFlags(it, i, acc.sigs, acc.hashes), ...infoFlags(it));
  acc.problems.push(...codes.map((c) => `items.${it.index}:${c}`));
  acc.flags.push(...flags.map((code) => ({ code, index: it.index })));
}

export function checkClaim(i: CheckInput): CheckResult {
  if (i.items.length === 0) {
    return { problems: ["claim:CLAIM_EMPTY"], flags: [],
      overLimitIndexes: [] };
  }
  const acc: Acc = { problems: [], flags: [], overLimitIndexes: [],
    running: new Map(), sigs: new Set(), hashes: new Set() };
  for (const it of i.items) checkItem(it, i, acc);
  return { problems: acc.problems, flags: acc.flags,
    overLimitIndexes: acc.overLimitIndexes };
}
