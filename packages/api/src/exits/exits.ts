import {
  SELF_SERVICE_KINDS,
  type ExitCreate,
  type ExitStatus,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { updateEmployee } from "../people/employee-actions";
import { loadEmployee } from "../people/employees";
import { inScope, viewerScope } from "../people/redact";
import { loadTerms } from "../onboarding/terms";
import { cancelFlowTasks } from "../tasks/tasks";
import { dubaiDate } from "../time/dubai";
import { storedAccess } from "./exit-hooks-view";
import { isSubject } from "./subject";
import {
  exitRows,
  exitSealer,
  loadExit,
  toExitView,
  type ExitRow,
} from "./exit-rows";
import { noticeFor } from "./notice";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;
type ListCtx = ReqCtx<unknown, { employeeId?: string;
  status?: ExitStatus }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;
const payroll = (ctx: ReqCtx) =>
  ctx.tenant!.role === "owner" || ctx.tenant!.role === "hr";

/** Owner and hr all; others the leaver themself and their scope. */
export function canSeeExit(ctx: ReqCtx, x: ExitRow): boolean {
  return inScope(viewerScope(ctx.tenant!), { id: x.employeeId,
    managerId: x.managerId });
}

export async function visibleExit(ctx: IdCtx, lock = false) {
  const x = await loadExit(ctx.tx, ctx.deps, co(ctx), ctx.params.id, lock);
  if (!canSeeExit(ctx, x)) throw new ApiError("NOT_FOUND");
  return x;
}

export async function exitView(ctx: ReqCtx, id: string) {
  const x = await loadExit(ctx.tx, ctx.deps, co(ctx), id);
  return toExitView(ctx.tx, co(ctx), x, ctx.tenant!);
}

export async function listExits(ctx: ListCtx) {
  const rows = (await exitRows(ctx.tx, ctx.deps, co(ctx))).filter((x) =>
    canSeeExit(ctx, x) &&
    (ctx.query.employeeId === undefined ||
      x.employeeId === ctx.query.employeeId) &&
    (ctx.query.status === undefined || x.status === ctx.query.status));
  const items = [];
  for (const x of rows) {
    items.push(await toExitView(ctx.tx, co(ctx), x, ctx.tenant!));
  }
  return { items };
}

export async function getExit(ctx: IdCtx) {
  return toExitView(ctx.tx, co(ctx), await visibleExit(ctx), ctx.tenant!);
}

/** Owner and hr: anyone, any kind. Others: self, self-service kinds. */
function leaverOf(ctx: ReqCtx<ExitCreate>): string {
  const own = ctx.tenant!.employeeId;
  const asked = ctx.body.employeeId ?? own;
  if (!payroll(ctx) && (asked !== own ||
    !SELF_SERVICE_KINDS.includes(ctx.body.kind))) {
    throw new ApiError("FORBIDDEN");
  }
  if (asked === null) throw new ApiError("NO_EMPLOYEE_LINK");
  if (!payroll(ctx)) checkSelfService(ctx);
  return asked;
}

/**
 * Self-service (review M-3): an agreed shorter notice is the
 * employer's to record, and notice cannot be given in the past.
 */
function checkSelfService(ctx: ReqCtx<ExitCreate>): void {
  if (ctx.body.agreedNoticeDays !== undefined) {
    throw new ApiError("FORBIDDEN", "Only owner or hr record an agreed " +
      "notice");
  }
  if (ctx.body.noticeGivenDate < dubaiDate(ctx.deps.now())) {
    throw new ApiError("VALIDATION_FAILED", "Notice cannot be back-dated",
      { fields: ["body.noticeGivenDate"] });
  }
}

async function insertExit(ctx: ReqCtx<ExitCreate>, employeeId: string,
  n: ReturnType<typeof noticeFor>): Promise<string> {
  const id = ctx.deps.newId();
  const s = await exitSealer(ctx.tx, ctx.deps, co(ctx));
  const v = n.value;
  const rows = await ctx.tx.query(
    `INSERT INTO exits (id, company_id, employee_id, kind, status,
       notice_given_date, notice_days, last_working_date,
       settlement_due_date, in_probation, flags, notice_trace, reason_enc,
       requested_by, created_at)
     VALUES ($1, $2, $3, $4, 'requested', $5, $6, $7, $8, $9, $10, $11,
       $12, $13, $14) ON CONFLICT DO NOTHING RETURNING id`,
    [id, co(ctx), employeeId, v.kind, ctx.body.noticeGivenDate,
      v.noticeDays, v.lastWorkingDate, v.settlementDueDate, v.inProbation,
      v.flags, JSON.stringify(n.trace),
      s.seal("reason_enc", id, ctx.body.reason ?? null), ctx.user!.id,
      ctx.deps.now().toISOString()]);
  if (rows.length === 0) throw new ApiError("EXIT_EXISTS");
  return id;
}

/** Notice from the engine and the stored terms; one open exit each. */
export async function createExit(ctx: ReqCtx<ExitCreate>) {
  const employeeId = leaverOf(ctx);
  const e = await loadEmployee(ctx.tx, ctx.deps, co(ctx), employeeId);
  const terms = await loadTerms(ctx.tx, co(ctx), e.id);
  if (terms === null) throw new ApiError("EMPLOYMENT_TERMS_REQUIRED");
  const id = await insertExit(ctx, e.id, noticeFor(e, terms, ctx.body));
  await auditFor(ctx, "exit", "exit.requested", id,
    { kind: ctx.body.kind });
  return exitView(ctx, id);
}

/** Puts back the leaver's earlier last working date, if still ours. */
async function restoreLastDay(ctx: ReqCtx, x: ExitRow) {
  const e = await loadEmployee(ctx.tx, ctx.deps, co(ctx), x.employeeId);
  if (e.lastWorkingDate !== x.lastWorkingDate) return;
  await updateEmployee(ctx, x.employeeId,
    { lastWorkingDate: x.priorLastWorkingDate });
}

/**
 * Owner or hr while requested or in notice; the requester alone only
 * while still requested (review M-4). The leaver may withdraw only
 * their own still-requested exit (review I-2).
 */
async function checkWithdraw(ctx: IdCtx, x: ExitRow): Promise<void> {
  const ownPending = x.requestedBy === ctx.user!.id &&
    x.status === "requested";
  if (!ownPending && await isSubject(ctx, x)) {
    throw new ApiError("SOD_VIOLATION");
  }
  if (!payroll(ctx) && !ownPending) throw new ApiError("FORBIDDEN");
  if (x.status !== "requested" && x.status !== "in-notice") {
    throw new ApiError("EXIT_NOT_OPEN");
  }
  const done = await storedAccess(ctx.tx, co(ctx), x);
  if (done?.inApp === "revoked") throw new ApiError("EXIT_ACCESS_REVOKED");
}

export async function withdrawExit(ctx: IdCtx) {
  const x = await visibleExit(ctx, true);
  await checkWithdraw(ctx, x);
  if (x.status === "in-notice") {
    await restoreLastDay(ctx, x);
    await cancelFlowTasks(ctx.tx, ctx.deps, co(ctx), ctx.user!.id,
      { type: "exit", id: x.id }, "exit withdrawn");
  }
  await ctx.tx.query(
    "UPDATE exits SET status = 'withdrawn' WHERE company_id = $1 AND id = $2",
    [co(ctx), x.id]);
  await auditFor(ctx, "exit", "exit.withdrawn", x.id);
  return exitView(ctx, x.id);
}
