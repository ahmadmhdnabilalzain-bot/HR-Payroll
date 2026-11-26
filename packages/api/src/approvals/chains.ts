import {
  SubjectType,
  type ApprovalChain,
  type ApprovalChainUpdate,
  type ApprovalTier,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import type { Db } from "../db/db";
import { parseAed } from "../db/money";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

interface ChainRow {
  version: number;
  tiers: ApprovalTier[];
  over_limit_approver: "owner" | "hr";
}

/** With no stored chain: the line manager approves everything. */
function defaultChain(type: SubjectType): ApprovalChain {
  return { subjectType: type, version: 0,
    tiers: [{ approver: { kind: "line-manager" }, minTotal: "0.00" }],
    overLimitApprover: "owner" };
}

export async function getChain(tx: Db, companyId: string,
  type: SubjectType): Promise<ApprovalChain> {
  const [r] = await tx.query<ChainRow>(
    `SELECT version, tiers, over_limit_approver FROM approval_chains
     WHERE company_id = $1 AND subject_type = $2`, [companyId, type]);
  if (r === undefined) return defaultChain(type);
  return { subjectType: type, version: r.version, tiers: r.tiers,
    overLimitApprover: r.over_limit_approver };
}

export async function listChains(tx: Db, companyId: string)
  : Promise<ApprovalChain[]> {
  const out: ApprovalChain[] = [];
  for (const t of SubjectType.options) out.push(await getChain(tx, companyId,
    t));
  return out;
}

/**
 * Tiers start at 0.00 and never decrease (so some tier always
 * applies), and a named user must be a member of the company.
 */
async function chainProblems(tx: Db, companyId: string,
  tiers: ApprovalTier[]): Promise<string[]> {
  const paths: string[] = [];
  if (parseAed(tiers[0]!.minTotal) !== 0n) paths.push("tiers.0.minTotal");
  tiers.forEach((t, i) => {
    const prev = tiers[i - 1];
    if (prev !== undefined &&
      parseAed(t.minTotal) < parseAed(prev.minTotal)) {
      paths.push(`tiers.${i}.minTotal`);
    }
  });
  for (const [i, t] of tiers.entries()) {
    if (t.approver.kind !== "user") continue;
    // A human member only: an API key's service user never approves.
    const m = await tx.query(
      `SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.company_id = $1 AND m.user_id = $2 AND u.kind = 'human'`,
      [companyId, t.approver.userId]);
    if (m.length === 0) paths.push(`tiers.${i}.approver.userId`);
  }
  return paths;
}

/** Version 0 means "no stored chain": only an insert can follow it. */
const INSERT = `INSERT INTO approval_chains (company_id, subject_type,
    version, tiers, over_limit_approver, updated_by, updated_at)
  SELECT $1, $2, 1, $4, $5, $6, $7 WHERE $3::int = 0
  ON CONFLICT (company_id, subject_type) DO NOTHING
  RETURNING version`;

const UPDATE = `UPDATE approval_chains SET version = version + 1,
    tiers = $4, over_limit_approver = $5, updated_by = $6, updated_at = $7
  WHERE company_id = $1 AND subject_type = $2 AND version = $3::int
  RETURNING version`;

/** Owner with MFA (route): optimistic on `expectedVersion`. */
export async function putChain(ctx: ReqCtx, type: SubjectType,
  body: ApprovalChainUpdate): Promise<ApprovalChain> {
  const c = ctx.tenant!.companyId;
  const paths = await chainProblems(ctx.tx, c, body.tiers);
  if (paths.length > 0) {
    throw new ApiError("CHAIN_INVALID", undefined, { paths });
  }
  const at = ctx.deps.now().toISOString();
  const sql = body.expectedVersion === 0 ? INSERT : UPDATE;
  const rows = await ctx.tx.query<{ version: number }>(sql,
    [c, type, body.expectedVersion, JSON.stringify(body.tiers),
      body.overLimitApprover, ctx.user!.id, at]);
  const version = rows[0]?.version;
  if (version === undefined || version !== body.expectedVersion + 1) {
    throw new ApiError("CHAIN_VERSION_CONFLICT");
  }
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "approval-chain.updated", entityType: "approval-chain",
    entityId: null, data: { subjectType: type, version,
      tierCount: body.tiers.length } });
  return getChain(ctx.tx, c, type);
}
