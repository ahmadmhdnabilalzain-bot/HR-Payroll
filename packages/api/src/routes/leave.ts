import type {
  LeaveAdjustmentCreate,
  LeaveDecision,
  LeaveRequestCreate,
  LeaveTypeCreate,
  LeaveTypeUpdate,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import { emitEvent } from "../channels/events";
import { eventCtx } from "../channels/notify";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  balanceFor,
  listLeaveTypes,
  loadLeaveType,
  toLeaveType,
} from "../leave/balances";
import {
  cancel,
  createRequest,
  decide,
  employeeRef,
  toLeaveRequest,
  type RequestRow,
} from "../leave/requests";
import { sealerFor } from "../people/employees";
import { inScope, viewerScope } from "../people/redact";
import { dubaiDate } from "../time/dubai";

type IdCtx<B = unknown, Q = unknown> = ReqCtx<B, Q, { id: string }>;
const co = (ctx: ReqCtx) => ctx.tenant!.companyId;
const sealer = (ctx: ReqCtx) =>
  sealerFor(ctx.tx, ctx.deps, co(ctx), "leave_requests");

async function audit(ctx: ReqCtx, action: string, entityType: string,
  id: string, data: AuditData = {}) {
  await appendAudit(ctx.tx, { companyId: co(ctx),
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType, entityId: id, data });
}

async function createType(ctx: ReqCtx<LeaveTypeCreate>) {
  const id = ctx.deps.newId();
  const b = ctx.body;
  await ctx.tx.query(
    `INSERT INTO leave_types (id, company_id, name, name_ar, paid,
       annual_days, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, co(ctx), b.name, b.nameAr ?? null, b.paid, b.annualDays,
      ctx.deps.now().toISOString()]);
  await audit(ctx, "leave-type.created", "leave-type", id);
  return toLeaveType(await loadLeaveType(ctx.tx, co(ctx), id));
}

async function updateType(ctx: IdCtx<LeaveTypeUpdate>) {
  const r = await loadLeaveType(ctx.tx, co(ctx), ctx.params.id);
  const b = ctx.body;
  const next = { ...r, name: b.name ?? r.name,
    name_ar: b.nameAr === undefined ? r.name_ar : b.nameAr,
    paid: b.paid ?? r.paid,
    annual_days: b.annualDays === undefined ? r.annual_days : b.annualDays };
  await ctx.tx.query(
    `UPDATE leave_types SET name = $3, name_ar = $4, paid = $5,
       annual_days = $6 WHERE company_id = $1 AND id = $2`,
    [co(ctx), r.id, next.name, next.name_ar, next.paid, next.annual_days]);
  const changed = Object.keys(b).filter((k) =>
    b[k as keyof LeaveTypeUpdate] !== undefined).sort();
  await audit(ctx, "leave-type.updated", "leave-type", r.id, { changed });
  return toLeaveType(next);
}

async function listRequests(ctx: ReqCtx<unknown, { employeeId?: string;
  status?: string; year?: number }>) {
  const q = ctx.query;
  const rows = await ctx.tx.query<RequestRow & { manager_id: string |
    null }>(
    `SELECT r.*, e.manager_id FROM leave_requests r
     JOIN employees e ON e.company_id = r.company_id AND e.id = r.employee_id
     WHERE r.company_id = $1 AND ($2::uuid IS NULL OR r.employee_id = $2)
       AND ($3::text IS NULL OR r.status = $3)
       AND ($4::int IS NULL OR extract(year FROM r.start_date) = $4)
     ORDER BY r.start_date, r.id`,
    [co(ctx), q.employeeId ?? null, q.status ?? null, q.year ?? null]);
  const scope = viewerScope(ctx.tenant!);
  const s = await sealer(ctx);
  return { items: rows.filter((r) => inScope(scope,
    { id: r.employee_id, managerId: r.manager_id }))
    .map((r) => toLeaveRequest(r, s)) };
}

async function createReq(ctx: ReqCtx<LeaveRequestCreate>) {
  const s = await sealer(ctx);
  const { row: r, plan } = await createRequest(ctx.tx, ctx.tenant!,
    ctx.user!.id, { id: ctx.deps.newId(), at: ctx.deps.now().toISOString(),
      today: dubaiDate(ctx.deps.now()) }, ctx.body, s);
  await audit(ctx, "leave.requested", "leave-request", r.id,
    { employeeId: r.employee_id, leaveTypeId: r.leave_type_id,
      days: r.half_units / 2 });
  if (plan.overridden) {
    await audit(ctx, "leave.blackout-overridden", "leave-request", r.id,
      { requestId: r.id });
  }
  await emitEvent(eventCtx(ctx), { type: "leave.requested",
    leaveRequestId: r.id, employeeId: r.employee_id, start: r.start_date,
    end: r.end_date });
  return { ...toLeaveRequest(r, s), warnings: plan.warnings };
}

function decider(to: "approved" | "rejected") {
  return async (ctx: IdCtx<LeaveDecision>) => {
    const s = await sealer(ctx);
    const r = await decide(ctx.tx, ctx.tenant!, ctx.user!.id, ctx.params.id,
      to, { at: ctx.deps.now().toISOString(), note: ctx.body.note ?? null },
      s);
    await audit(ctx, `leave.${to}`, "leave-request", r.id,
      { employeeId: r.employee_id });
    await emitEvent(eventCtx(ctx), { type: "leave.decided",
      leaveRequestId: r.id, employeeId: r.employee_id,
      start: r.start_date, end: r.end_date, outcome: to });
    return toLeaveRequest(r, s);
  };
}

async function balances(ctx: IdCtx<unknown, { year?: number }>) {
  const ref = await employeeRef(ctx.tx, co(ctx), ctx.params.id);
  if (!inScope(viewerScope(ctx.tenant!), ref)) {
    throw new ApiError("NOT_FOUND");
  }
  const year = ctx.query.year ??
    Number(dubaiDate(ctx.deps.now()).slice(0, 4));
  const types = (await listLeaveTypes(ctx.tx, co(ctx)))
    .filter((t) => t.annual_days !== null);
  const items = [];
  for (const t of types) {
    items.push(await balanceFor(ctx.tx, co(ctx), ref.id, t.id, year,
      dubaiDate(ctx.deps.now())));
  }
  return { items };
}

async function adjust(ctx: ReqCtx<LeaveAdjustmentCreate>) {
  const b = ctx.body;
  if (b.employeeId === ctx.tenant!.employeeId) {
    throw new ApiError("SOD_VIOLATION");
  }
  await employeeRef(ctx.tx, co(ctx), b.employeeId);
  await loadLeaveType(ctx.tx, co(ctx), b.leaveTypeId);
  const id = ctx.deps.newId();
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO leave_adjustments (id, company_id, employee_id,
       leave_type_id, year, days, reason, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, co(ctx), b.employeeId, b.leaveTypeId, b.year, b.days, b.reason,
      ctx.user!.id, at]);
  await audit(ctx, "leave.adjusted", "leave-adjustment", id,
    { employeeId: b.employeeId, leaveTypeId: b.leaveTypeId, year: b.year,
      days: b.days });
  return { ...b, id, createdBy: ctx.user!.id, createdAt: at };
}

export function registerLeaveRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listLeaveTypes", async (ctx) => ({
    items: (await listLeaveTypes(ctx.tx, co(ctx))).map(toLeaveType) }));
  register(app, deps, "createLeaveType", createType);
  register(app, deps, "updateLeaveType", updateType);
  register(app, deps, "listLeaveRequests", listRequests);
  register(app, deps, "createLeaveRequest", createReq);
  register(app, deps, "cancelLeaveRequest", async (ctx: IdCtx) => {
    const r = await cancel(ctx.tx, ctx.tenant!, ctx.params.id);
    await audit(ctx, "leave.cancelled", "leave-request", r.id,
      { employeeId: r.employee_id });
    return toLeaveRequest(r, await sealer(ctx));
  });
  register(app, deps, "approveLeaveRequest", decider("approved"));
  register(app, deps, "rejectLeaveRequest", decider("rejected"));
  register(app, deps, "getLeaveBalances", balances);
  register(app, deps, "createLeaveAdjustment", adjust);
}
