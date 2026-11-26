import type { ClaimFlag, ExpenseClaim } from "@payroll/contract";
import { fils } from "@payroll/engine";
import { openRequest } from "../approvals/requests";
import type { SubjectHandlers } from "../approvals/subjects";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";
import { checkClaim, type CheckResult } from "./check";
import { claimView, itemsOf, visibleClaim, type ItemRow } from "./claim-view";
import { claimAudit, editableClaim } from "./claims";
import { totalProblem } from "./items";
import { limitFor, toPolicyF, type PolicyF } from "./policy";
import { getPolicy } from "./policy-store";
import {
  checkItems,
  claimantRole,
  FLAG_MESSAGES,
  otherClaims,
  reprice,
} from "./submit-facts";

/** Locks the claimant's row: monthly limits are serialised per person. */
async function lockEmployee(ctx: ReqCtx, id: string): Promise<string> {
  const [e] = await ctx.tx.query<{ joining_date: string }>(
    `SELECT joining_date FROM employees WHERE company_id = $1 AND id = $2
     FOR UPDATE`, [ctx.tenant!.companyId, id]);
  if (e === undefined) throw new ApiError("NOT_FOUND");
  return e.joining_date;
}

async function categoryMap(ctx: ReqCtx) {
  const rows = await ctx.tx.query<{ id: string; kind: "receipt";
    active: boolean }>(
    "SELECT id, kind, active FROM expense_categories WHERE company_id = $1",
    [ctx.tenant!.companyId]);
  return new Map(rows.map((r) => [r.id, { kind: r.kind,
    active: r.active }]));
}

async function runChecks(ctx: ReqCtx, claim: { id: string;
  employee_id: string }, items: ItemRow[], p: PolicyF)
  : Promise<CheckResult> {
  const joiningDate = await lockEmployee(ctx, claim.employee_id);
  const ok = await reprice(ctx, items, p);
  const role = await claimantRole(ctx, claim.employee_id);
  const others = await otherClaims(ctx, claim);
  const result = checkClaim({ items: await checkItems(ctx, items, ok),
    role, today: dubaiDate(ctx.deps.now()), joiningDate,
    claimWindowDays: p.claimWindowDays, categories: await categoryMap(ctx),
    limits: (cat) => limitFor(p, cat, role),
    monthToDate: others.monthToDate, otherSignatures: others.signatures,
    otherHashes: others.hashes, companyHashes: others.companyHashes });
  const total = items.reduce((n, i) => n + BigInt(i.amount), 0n);
  const problems = [...result.problems, ...totalProblem(total)];
  if (problems.length > 0) {
    throw new ApiError("CLAIM_PROBLEMS", undefined, { problems });
  }
  return result;
}

/** Stores over-limit marks, totals, flags and the policy version. */
async function storeResult(ctx: ReqCtx, claimId: string, items: ItemRow[],
  result: CheckResult, policyVersion: number): Promise<ClaimFlag[]> {
  const c = ctx.tenant!.companyId;
  const byIdx = new Map(items.map((i) => [i.idx, i]));
  for (const i of items) {
    await ctx.tx.query(`UPDATE expense_items SET over_limit = $3
      WHERE company_id = $1 AND id = $2`,
    [c, i.id, result.overLimitIndexes.includes(i.idx)]);
  }
  const flags: ClaimFlag[] = result.flags.map((f) => ({ code: f.code,
    itemId: f.index === null ? null : byIdx.get(f.index)!.id,
    message: FLAG_MESSAGES[f.code] }));
  const total = items.reduce((n, i) => n + BigInt(i.amount), 0n);
  const vat = items.reduce((n, i) => n + BigInt(i.vat_amount), 0n);
  await ctx.tx.query(
    `UPDATE expense_claims SET total = $3, vat_total = $4, flags = $5,
       policy_version = $6 WHERE company_id = $1 AND id = $2`,
    [c, claimId, fils(total), fils(vat), JSON.stringify(flags),
      policyVersion]);
  return flags;
}

/**
 * Prices every item again with the current policy, checks the claim
 * (every problem reported), stores the result and opens an approval
 * request. NO_ELIGIBLE_APPROVER (422) leaves the claim a draft.
 */
export async function submitClaim(ctx: ReqCtx, handlers: SubjectHandlers,
  id: string): Promise<ExpenseClaim> {
  const c = ctx.tenant!.companyId;
  const r = await editableClaim(ctx, id);
  const policy = await getPolicy(ctx.tx, c);
  const items = await itemsOf(ctx.tx, c, r);
  const result = await runChecks(ctx, r, items, toPolicyF(policy));
  const flags = await storeResult(ctx, r.id, items, result, policy.version);
  const approval = await openRequest(ctx, handlers, "expense-claim", r.id,
    ctx.user!.id);
  await ctx.tx.query(
    `UPDATE expense_claims SET status = 'submitted', submitted_by = $3,
       submitted_at = $4, approval_id = $5, decided_at = NULL
     WHERE company_id = $1 AND id = $2`,
    [c, r.id, ctx.user!.id, ctx.deps.now().toISOString(), approval.id]);
  await claimAudit(ctx, "submitted", r.id, { itemCount: items.length,
    flagCodes: [...new Set(flags.map((f) => f.code))] });
  return claimView(ctx, await visibleClaim(ctx, r.id));
}
