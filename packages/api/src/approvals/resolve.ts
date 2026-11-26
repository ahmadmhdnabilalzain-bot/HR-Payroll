import type { ApproverSpec, Role } from "@payroll/contract";
import type { Fils } from "@payroll/engine";
import { ApiError } from "../http/errors";

/**
 * Pure chain resolution and separation-of-duties checks. No database,
 * clock or environment: facts in, steps or a verdict out.
 */
export interface ResolveInput {
  tiers: { approver: ApproverSpec; minTotal: Fils }[];
  overLimitApprover: "owner" | "hr";
  total: Fils;
  overLimit: boolean;
  claimantUserId: string | null;
  submitterUserId: string;
  lineManagerUserId: string | null;
  members: { userId: string; role: Role }[];
}

export interface ResolvedStep {
  order: number;
  approver: ApproverSpec;
  eligible: string[];
}

/** Six steps at most: five tiers plus the over-limit approver. */
const MAX_STEPS = 6;

export type Verdict = "ok" | "NOT_AN_APPROVER" | "SOD_VIOLATION" |
  "APPROVER_NEEDED_LATER";

function appliedTiers(i: ResolveInput): ApproverSpec[] {
  const out = i.tiers.filter((t) => t.minTotal <= i.total)
    .map((t) => t.approver);
  const escalate = i.overLimit && !out.some((a) => a.kind === "role" &&
    a.role === i.overLimitApprover);
  if (escalate) out.push({ kind: "role", role: i.overLimitApprover });
  return out;
}

function candidates(a: ApproverSpec, i: ResolveInput,
  excluded: Set<string>): string[] {
  const member = (u: string | null) => u !== null && !excluded.has(u) &&
    i.members.some((m) => m.userId === u);
  if (a.kind === "line-manager") {
    return member(i.lineManagerUserId) ? [i.lineManagerUserId!] : [];
  }
  if (a.kind === "user") return member(a.userId) ? [a.userId] : [];
  return i.members.filter((m) => m.role === a.role &&
    !excluded.has(m.userId)).map((m) => m.userId).sort();
}

/** An empty line-manager, user or hr step falls to hr, then owner. */
function stepFor(a: ApproverSpec, order: number, i: ResolveInput,
  excluded: Set<string>): ResolvedStep {
  const chain: ApproverSpec[] = [a];
  if (!(a.kind === "role" && a.role === "owner")) {
    if (!(a.kind === "role" && a.role === "hr")) {
      chain.push({ kind: "role", role: "hr" });
    }
    chain.push({ kind: "role", role: "owner" });
  }
  for (const spec of chain) {
    const eligible = candidates(spec, i, excluded);
    if (eligible.length > 0) return { order, approver: spec, eligible };
  }
  throw new ApiError("NO_ELIGIBLE_APPROVER");
}

/**
 * The steps for one subject. Throws 422 NO_ELIGIBLE_APPROVER when a
 * step has nobody, when no tier applies, or when the steps cannot be
 * given to distinct people. The claimant and submitter are never
 * eligible.
 */
export function resolveChain(i: ResolveInput): ResolvedStep[] {
  const specs = appliedTiers(i);
  if (specs.length === 0 || specs.length > MAX_STEPS) {
    throw new ApiError("NO_ELIGIBLE_APPROVER");
  }
  const excluded = new Set([i.submitterUserId]);
  if (i.claimantUserId !== null) excluded.add(i.claimantUserId);
  const steps = specs.map((a, n) => stepFor(a, n + 1, i, excluded));
  if (!hasDistinctApprovers(steps.map((s) => s.eligible))) {
    throw new ApiError("NO_ELIGIBLE_APPROVER");
  }
  return steps;
}

/** Can each list give a different person? (backtracking, <= 6 lists) */
export function hasDistinctApprovers(eligible: string[][]): boolean {
  const used = new Set<string>();
  const assign = (k: number): boolean => {
    if (k === eligible.length) return true;
    for (const u of eligible[k]!) {
      if (used.has(u)) continue;
      used.add(u);
      if (assign(k + 1)) return true;
      used.delete(u);
    }
    return false;
  };
  return assign(0);
}

/**
 * May `actor` decide step `current` (its order)? `priorApprovers` are
 * the people who approved earlier steps; `excluded` the claimant and
 * submitter. The actor must also leave enough distinct people for the
 * steps after this one.
 */
export function mayDecide(steps: ResolvedStep[], current: number,
  actor: string, priorApprovers: string[], excluded: string[]): Verdict {
  if (excluded.includes(actor) || priorApprovers.includes(actor)) {
    return "SOD_VIOLATION";
  }
  const step = steps.find((s) => s.order === current);
  if (step === undefined || !step.eligible.includes(actor)) {
    return "NOT_AN_APPROVER";
  }
  const taken = new Set([...priorApprovers, actor]);
  const later = steps.filter((s) => s.order > current)
    .map((s) => s.eligible.filter((u) => !taken.has(u)));
  return hasDistinctApprovers(later) ? "ok" : "APPROVER_NEEDED_LATER";
}
