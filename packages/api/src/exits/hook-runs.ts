import type { ReqCtx } from "../http/context";

/** One exit hook run row (insert only). */
export async function addRun(ctx: ReqCtx, exitId: string, hook: string,
  r: { kind: string; status: string; ref: string | null }): Promise<void> {
  await ctx.tx.query(
    `INSERT INTO exit_hook_runs (id, company_id, exit_id, hook, kind,
       status, ref, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [ctx.deps.newId(), ctx.tenant!.companyId, exitId, hook, r.kind,
      r.status, r.ref, ctx.deps.now().toISOString()]);
}
