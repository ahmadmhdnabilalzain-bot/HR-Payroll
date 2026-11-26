import type { Candidate, CandidateCreate } from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

interface CandidateRow {
  id: string; full_name: string; email: string | null;
  phone: string | null; source: Candidate["source"];
  source_detail: string | null; created_at: string;
}

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

function toCandidate(r: CandidateRow): Candidate {
  return { id: r.id, fullName: r.full_name, email: r.email,
    phone: r.phone, source: r.source, sourceDetail: r.source_detail,
    createdAt: r.created_at };
}

/** Owner and hr only (route roles); contact data never audited. */
export async function listCandidates(ctx: ReqCtx) {
  const rows = await ctx.tx.query<CandidateRow>(
    `SELECT * FROM candidates WHERE company_id = $1
     ORDER BY created_at DESC, id`, [co(ctx)]);
  return { items: rows.map(toCandidate) };
}

/**
 * A duplicate email (any case) is 409 CANDIDATE_EXISTS. The insert
 * skips on the unique index instead of failing, so the request's one
 * transaction stays usable and two parallel creates cannot both win.
 */
export async function createCandidate(ctx: ReqCtx<CandidateCreate>) {
  const b = ctx.body;
  const id = ctx.deps.newId();
  const rows = await ctx.tx.query<CandidateRow>(
    `INSERT INTO candidates (id, company_id, full_name, email, phone,
       source, source_detail, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING RETURNING *`,
    [id, co(ctx), b.fullName, b.email ?? null, b.phone ?? null, b.source,
      b.sourceDetail ?? null, ctx.deps.now().toISOString()]);
  if (rows[0] === undefined) throw new ApiError("CANDIDATE_EXISTS");
  await auditFor(ctx, "candidate", "candidate.created", id);
  return toCandidate(rows[0]);
}

/** The candidate's display name (404 when absent). */
export async function candidateName(ctx: ReqCtx,
  id: string): Promise<string> {
  const [r] = await ctx.tx.query<{ full_name: string }>(
    "SELECT full_name FROM candidates WHERE company_id = $1 AND id = $2",
    [co(ctx), id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r.full_name;
}
