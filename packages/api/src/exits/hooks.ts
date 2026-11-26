import type {
  AccessResult,
  DocumentKind,
  DocumentsRequest,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import type { DocumentResult } from "../ports/documents";
import { dubaiDate } from "../time/dubai";
import { storedAccess } from "./exit-hooks-view";
import type { ExitRow } from "./exit-rows";
import { exitView, visibleExit } from "./exits";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

async function addRun(ctx: ReqCtx, exitId: string, hook: string,
  r: { kind: string; status: string; ref: string | null }) {
  await ctx.tx.query(
    `INSERT INTO exit_hook_runs (id, company_id, exit_id, hook, kind,
       status, ref, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [ctx.deps.newId(), co(ctx), exitId, hook, r.kind, r.status, r.ref,
      ctx.deps.now().toISOString()]);
}

/** Ports run in the handler's transaction; a throw is "failed". */
async function generate(ctx: IdCtx<DocumentsRequest>, x: ExitRow,
  kind: DocumentKind) {
  let out: DocumentResult | { status: "failed" };
  try {
    out = await ctx.deps.documents.generate({ companyId: co(ctx),
      exitId: x.id, employeeId: x.employeeId, kind, lang: ctx.body.lang });
  } catch {
    out = { status: "failed" };
  }
  const ref = out.status === "generated" ? out.documentRef : null;
  await addRun(ctx, x.id, "documents", { kind, status: out.status, ref });
  return out.status;
}

/**
 * Experience certificate and settlement statement through the
 * document port (ids only). Needs an approved or closed exit; the
 * statement needs a computed settlement.
 */
export async function generateDocuments(ctx: IdCtx<DocumentsRequest>) {
  const x = await visibleExit(ctx, true);
  if (x.status !== "in-notice" && x.status !== "closed") {
    throw new ApiError("EXIT_NOT_APPROVED");
  }
  const kinds = [...new Set(ctx.body.kinds)];
  if (kinds.includes("settlement-statement") &&
    x.settlement?.settlement.status !== "computed") {
    throw new ApiError("SETTLEMENT_REQUIRED");
  }
  const statuses: string[] = [];
  for (const k of kinds) statuses.push(await generate(ctx, x, k));
  await auditFor(ctx, "exit", "exit.documents-requested", x.id,
    { kinds, statuses });
  return exitView(ctx, x.id);
}

/**
 * Marks this company's unused invites for the leaver as used: those
 * linked to the leaver's employee record and those sent to the email
 * of a login being revoked. Otherwise an invite issued before the exit
 * could restore access after it (only a new invite may).
 */
async function closeInvites(ctx: ReqCtx, x: ExitRow, userIds: string[]) {
  await ctx.tx.query(
    `UPDATE invites SET used_at = $4 WHERE company_id = $1
     AND used_at IS NULL AND (employee_id = $2 OR lower(email) IN
       (SELECT lower(u.email) FROM users u WHERE u.id = ANY($3::uuid[])))`,
    [co(ctx), x.employeeId, userIds, ctx.deps.now().toISOString()]);
}

/**
 * Revokes every unrevoked membership of this company linked to the
 * leaver. Owner rows are locked first (as for role changes) so two
 * revocations cannot leave the company with no owner (409 LAST_OWNER,
 * nothing changed). Returns "revoked" or "no-login".
 */
async function revokeInApp(ctx: ReqCtx, x: ExitRow) {
  const owners = await ctx.tx.query<{ user_id: string }>(
    `SELECT user_id FROM memberships WHERE company_id = $1
     AND role = 'owner' AND revoked_at IS NULL ORDER BY user_id
     FOR UPDATE`, [co(ctx)]);
  const mine = await ctx.tx.query<{ user_id: string; role: string }>(
    `SELECT user_id, role FROM memberships WHERE company_id = $1
     AND employee_id = $2 AND revoked_at IS NULL FOR UPDATE`,
    [co(ctx), x.employeeId]);
  const lost = mine.filter((m) => m.role === "owner").length;
  if (lost > 0 && owners.length - lost < 1) throw new ApiError("LAST_OWNER");
  await closeInvites(ctx, x, mine.map((m) => m.user_id));
  if (mine.length === 0) return "no-login" as const;
  await ctx.tx.query(
    `UPDATE memberships SET revoked_at = $3, revoked_by = $4
     WHERE company_id = $1 AND employee_id = $2 AND revoked_at IS NULL`,
    [co(ctx), x.employeeId, ctx.deps.now().toISOString(), ctx.user!.id]);
  return "revoked" as const;
}

async function revokeExternal(ctx: ReqCtx, x: ExitRow) {
  try {
    const r = await ctx.deps.access.revoke({ companyId: co(ctx),
      exitId: x.id, employeeId: x.employeeId });
    return r.status;
  } catch {
    return "failed" as const;
  }
}

/** Owner or hr with MFA. A repeat returns the stored result. */
export async function revokeAccess(ctx: IdCtx): Promise<AccessResult> {
  const x = await visibleExit(ctx, true);
  const done = await storedAccess(ctx.tx, co(ctx), x);
  if (done !== null) return done;
  if (x.status !== "in-notice") throw new ApiError("EXIT_NOT_APPROVED");
  const inApp = await revokeInApp(ctx, x);
  const external = await revokeExternal(ctx, x);
  await addRun(ctx, x.id, "access", { kind: "in-app", status: inApp,
    ref: null });
  await addRun(ctx, x.id, "access", { kind: "external", status: external,
    ref: null });
  await auditFor(ctx, "exit", "exit.access-revoked", x.id,
    { inApp, external });
  const at = ctx.deps.now().toISOString();
  return { inApp, external, at,
    beforeLastDay: dubaiDate(ctx.deps.now()) < x.lastWorkingDate };
}
