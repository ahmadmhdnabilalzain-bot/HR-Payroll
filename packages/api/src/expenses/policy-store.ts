import type {
  ExpensePolicy,
  ExpensePolicyUpdate,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import type { Db } from "../db/db";
import { parseAed } from "../db/money";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

type Body = Pick<ExpensePolicy, "limits" | "mileageRates" | "perDiemRates">;

interface PolicyRow {
  version: number;
  claim_window_days: number | null;
  body: Body;
}

/** No stored policy: version 0, no limits, no rates, no window. */
export async function getPolicy(tx: Db, companyId: string)
  : Promise<ExpensePolicy> {
  const [r] = await tx.query<PolicyRow>(
    `SELECT version, claim_window_days, body FROM expense_policies
     WHERE company_id = $1`, [companyId]);
  if (r === undefined) {
    return { version: 0, claimWindowDays: null, limits: [],
      mileageRates: [], perDiemRates: [] };
  }
  return { version: r.version, claimWindowDays: r.claim_window_days,
    ...r.body };
}

function duplicates<T>(rows: T[], key: (r: T) => string, path: string,
  out: string[]): void {
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const k = key(r);
    if (seen.has(k)) out.push(`${path}.${i}`);
    seen.add(k);
  });
}

function rateProblems(b: ExpensePolicyUpdate, out: string[]): void {
  const rk = (r: { code: string; effectiveFrom: string }) =>
    `${r.code}|${r.effectiveFrom}`;
  duplicates(b.mileageRates, rk, "mileageRates", out);
  b.mileageRates.forEach((r, i) => {
    if (parseAed(r.perKm) === 0n) out.push(`mileageRates.${i}.perKm`);
  });
  duplicates(b.perDiemRates, rk, "perDiemRates", out);
  b.perDiemRates.forEach((r, i) => {
    if (parseAed(r.daily) === 0n) out.push(`perDiemRates.${i}.daily`);
  });
}

async function policyProblems(tx: Db, companyId: string,
  b: ExpensePolicyUpdate): Promise<string[]> {
  const rows = await tx.query<{ id: string }>(
    "SELECT id FROM expense_categories WHERE company_id = $1", [companyId]);
  const known = new Set(rows.map((r) => r.id));
  const out: string[] = [];
  b.limits.forEach((l, i) => {
    if (!known.has(l.categoryId)) out.push(`limits.${i}.categoryId`);
  });
  duplicates(b.limits, (l) => `${l.categoryId}|${l.role}`, "limits", out);
  rateProblems(b, out);
  return out;
}

const INSERT = `INSERT INTO expense_policies (company_id, version,
    claim_window_days, body, updated_by, updated_at)
  SELECT $1, 1, $3, $4, $5, $6 WHERE $2::int = 0
  ON CONFLICT (company_id) DO NOTHING RETURNING version`;

const UPDATE = `UPDATE expense_policies SET version = version + 1,
    claim_window_days = $3, body = $4, updated_by = $5, updated_at = $6
  WHERE company_id = $1 AND version = $2::int RETURNING version`;

/** Owner and hr; optimistic on `expectedVersion`; 422 with paths. */
export async function putPolicy(ctx: ReqCtx<ExpensePolicyUpdate>)
  : Promise<ExpensePolicy> {
  const c = ctx.tenant!.companyId;
  const b = ctx.body;
  const paths = await policyProblems(ctx.tx, c, b);
  if (paths.length > 0) {
    throw new ApiError("POLICY_INVALID", undefined, { paths });
  }
  const at = ctx.deps.now().toISOString();
  const body: Body = { limits: b.limits, mileageRates: b.mileageRates,
    perDiemRates: b.perDiemRates };
  const rows = await ctx.tx.query<{ version: number }>(
    b.expectedVersion === 0 ? INSERT : UPDATE,
    [c, b.expectedVersion, b.claimWindowDays, JSON.stringify(body),
      ctx.user!.id, at]);
  const version = rows[0]?.version;
  if (version !== b.expectedVersion + 1) {
    throw new ApiError("POLICY_VERSION_CONFLICT");
  }
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "expense-policy.updated", entityType: "expense-policy",
    entityId: null, data: { version, limitCount: b.limits.length,
      rateCount: b.mileageRates.length + b.perDiemRates.length } });
  return getPolicy(ctx.tx, c);
}
