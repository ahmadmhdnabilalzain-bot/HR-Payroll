import { fils } from "@payroll/engine";
import {
  employeeUsers,
  type Outcome,
  type SubjectHandler,
} from "../approvals/subjects";
import type { Db } from "../db/db";
import { toMoney } from "../db/money";
import { ApiError } from "../http/errors";
import { CLAIM_SELECT, visibleClaim, type ClaimRow } from "./claim-view";
import { claimAudit } from "./claims";

async function claimRow(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<ClaimRow>(`${CLAIM_SELECT}
    WHERE c.company_id = $1 AND c.id = $2`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  const over = await tx.query(
    `SELECT 1 FROM expense_items WHERE company_id = $1 AND claim_id = $2
       AND revision = $3 AND over_limit LIMIT 1`,
    [companyId, id, r.revision]);
  return { ...r, over: over.length > 0 };
}

const STATUS: Record<Outcome, string> = { approved: "approved",
  rejected: "rejected", returned: "returned" };

/** Expense claims on the approval spine. */
export const expenseClaimSubject: SubjectHandler = {
  type: "expense-claim",
  async facts(tx, companyId, id) {
    const r = await claimRow(tx, companyId, id);
    const users = await employeeUsers(tx, companyId, r.employee_id);
    const total = fils(BigInt(r.total));
    const makerUserIds = [...new Set([r.created_by, ...r.editors])];
    return { claimantEmployeeId: r.employee_id, ...users, makerUserIds,
      total,
      overLimit: r.over, summary: { employeeName: r.employee_name,
        title: r.title, total: toMoney(total),
        flagCodes: [...new Set(r.flags.map((f) => f.code))] } };
  },
  async canView(ctx, id) {
    try {
      await visibleClaim(ctx, id);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === "NOT_FOUND") return false;
      throw e;
    }
  },
  /** Approved and rejected are final; returned is editable again. */
  async onClosed(ctx, id, outcome) {
    const decided = outcome === "returned" ? null
      : ctx.deps.now().toISOString();
    const done = await ctx.tx.query(
      `UPDATE expense_claims SET status = $3, decided_at = $4
       WHERE company_id = $1 AND id = $2 AND status = 'submitted'
       RETURNING id`, [ctx.tenant!.companyId, id, STATUS[outcome], decided]);
    if (done.length !== 1) throw new ApiError("APPROVAL_NOT_PENDING");
    await claimAudit(ctx, outcome, id, {});
  },
};
