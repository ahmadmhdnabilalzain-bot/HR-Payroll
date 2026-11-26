import {
  EXIT_FLAG_ONLY,
  EXIT_FLAG_ONLY_NOTE,
  type Decision,
  type ExitSettlement,
  type SettlementInputs,
} from "@payroll/contract";
import { assertDecidable } from "../approvals/assert-decidable";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { expandTemplate } from "../onboarding/expand";
import { getTemplate } from "../onboarding/templates";
import { userOfEmployee } from "../onboarding/terms";
import { updateEmployee } from "../people/employee-actions";
import { loadEmployee, type EmployeeRow } from "../people/employees";
import { createTasks, type NewTaskInput } from "../tasks/tasks";
import { exitSealer, type ExitRow } from "./exit-rows";
import { exitView, visibleExit } from "./exits";
import { computeExitSettlement } from "./settlement";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;
const DUE_LINE = "employment.settlement.due";

function dueLine(x: ExitRow) {
  const line = x.noticeTrace.find((l) => l.id === DUE_LINE);
  if (line === undefined) throw new Error("exit has no settlement line");
  return line;
}

/** The exit checklist plus the settlement deadline (engine date). */
async function exitTasks(ctx: ReqCtx, x: ExitRow, e: EmployeeRow) {
  const flow = { type: "exit" as const, id: x.id };
  const t = await getTemplate(ctx.tx, co(ctx), "exit");
  const people = {
    managerUserId: await userOfEmployee(ctx.tx, co(ctx), e.managerId),
    employeeUserId: await userOfEmployee(ctx.tx, co(ctx), e.id) };
  const deadline: NewTaskInput = {
    title: "Pay the final settlement by this date", description: null,
    assigneeUserId: null, assigneeRole: "hr",
    dueDate: x.settlementDueDate, employeeId: e.id, flow,
    source: "exit-deadline", rule: dueLine(x), checklist: [] };
  return createTasks(ctx.tx, ctx.deps, co(ctx), ctx.user!.id, [
    ...expandTemplate(t, x.lastWorkingDate, people,
      { employeeId: e.id, flow, source: "exit-template" }), deadline]);
}

async function approve(ctx: IdCtx<Decision>, x: ExitRow) {
  const e = await loadEmployee(ctx.tx, ctx.deps, co(ctx), x.employeeId);
  await ctx.tx.query(
    `UPDATE exits SET status = 'in-notice', prior_last_working_date = $3
     WHERE company_id = $1 AND id = $2`,
    [co(ctx), x.id, e.lastWorkingDate]);
  await updateEmployee(ctx, e.id, { lastWorkingDate: x.lastWorkingDate });
  await exitTasks(ctx, x, e);
  await auditFor(ctx, "exit", "exit.approved", x.id,
    { lastWorkingDate: x.lastWorkingDate });
}

/** Owner or hr, never the requester (no MFA: Ruling 16). */
export async function decideExit(ctx: IdCtx<Decision>) {
  const x = await visibleExit(ctx, true);
  assertDecidable(ctx, { status: x.status, requestedBy: x.requestedBy },
    { pending: "requested", roles: ["owner", "hr"] });
  await ctx.tx.query(
    `UPDATE exits SET decided_by = $3, decided_at = $4, decision_note = $5
     WHERE company_id = $1 AND id = $2`, [co(ctx), x.id, ctx.user!.id,
      ctx.deps.now().toISOString(), ctx.body.note ?? null]);
  if (ctx.body.approve) await approve(ctx, x);
  else {
    await ctx.tx.query(
      `UPDATE exits SET status = 'rejected' WHERE company_id = $1
       AND id = $2`, [co(ctx), x.id]);
    await auditFor(ctx, "exit", "exit.rejected", x.id);
  }
  return exitView(ctx, x.id);
}

/** The stored recurring monthly basic (never a one-off or override). */
function recurringBasic(e: EmployeeRow) {
  const basic = e.salary?.find((c) => c.code === "basic");
  if (basic === undefined) throw new ApiError("SALARY_REQUIRED");
  return basic.amount;
}

function settlementOf(ctx: ReqCtx<SettlementInputs>, x: ExitRow,
  e: EmployeeRow): ExitSettlement {
  const i = ctx.body;
  return {
    settlement: computeExitSettlement({ joiningDate: e.joiningDate,
      lastWorkingDate: x.lastWorkingDate, workerClass: e.workerClass,
      lastBasicMonthly: recurringBasic(e),
      unusedLeaveDays: i.unusedLeaveDays,
      serviceUnpaidLeaveDays: i.serviceUnpaidLeaveDays }),
    flagOnly: [...EXIT_FLAG_ONLY], flagOnlyNote: EXIT_FLAG_ONLY_NOTE,
    inputs: { unusedLeaveDays: i.unusedLeaveDays,
      serviceUnpaidLeaveDays: i.serviceUnpaidLeaveDays,
      salaryVersion: e.salaryVersion },
    dueDate: x.settlementDueDate, dueTrace: dueLine(x),
    version: x.settlementVersion + 1,
    computedAt: ctx.deps.now().toISOString() };
}

/**
 * Computes and stores (encrypted) the final settlement. A refusal by
 * the engine is stored and shown with status 200. Recomputing replaces
 * the stored one (version + 1) until the exit is closed.
 */
export async function computeSettlement(ctx: IdCtx<SettlementInputs>) {
  const x = await visibleExit(ctx, true);
  if (x.status !== "in-notice") throw new ApiError("EXIT_NOT_APPROVED");
  const e = await loadEmployee(ctx.tx, ctx.deps, co(ctx), x.employeeId);
  const st = settlementOf(ctx, x, e);
  const s = await exitSealer(ctx.tx, ctx.deps, co(ctx));
  await ctx.tx.query(
    `UPDATE exits SET settlement_enc = $3, settlement_version = $4
     WHERE company_id = $1 AND id = $2`, [co(ctx), x.id,
      s.seal("settlement_enc", x.id, JSON.stringify(st)), st.version]);
  await auditFor(ctx, "exit", "exit.settlement-computed", x.id,
    { version: st.version, status: st.settlement.status });
  return exitView(ctx, x.id);
}
