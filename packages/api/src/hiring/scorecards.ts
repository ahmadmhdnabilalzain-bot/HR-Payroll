import type { ScorecardCreate } from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { appAccess, toApplication } from "./application-view";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

/**
 * The caller's own scorecard. A manager must be the hiring manager or
 * an interviewer on the application (else 404); one per interviewer
 * (409 SCORECARD_EXISTS, from the unique index).
 */
export async function submitScorecard(ctx: IdCtx<ScorecardCreate>) {
  const a = await appAccess(ctx, ctx.params.id);
  if (!a.hiringSide && !a.interviewer) throw new ApiError("NOT_FOUND");
  const id = ctx.deps.newId();
  const b = ctx.body;
  const rows = await ctx.tx.query(
    `INSERT INTO scorecards (id, company_id, application_id,
       interviewer_user_id, criteria, recommendation, summary,
       submitted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING RETURNING id`,
    [id, ctx.tenant!.companyId, a.row.id, ctx.user!.id,
      JSON.stringify(b.criteria), b.recommendation, b.summary ?? null,
      ctx.deps.now().toISOString()]);
  if (rows.length === 0) throw new ApiError("SCORECARD_EXISTS");
  await auditFor(ctx, "application", "scorecard.submitted", a.row.id);
  return toApplication(ctx, a);
}
