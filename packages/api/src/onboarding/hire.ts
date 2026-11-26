import type {
  EmployeeCreate,
  HireRequest,
  HireResult,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import { toMoney } from "../db/money";
import { setStage } from "../hiring/applications";
import { appAccess } from "../hiring/application-view";
import { loadOffer, type OfferRow } from "../hiring/offer-rows";
import { Reply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { createEmployee, setSalary } from "../people/employee-actions";
import { loadEmployee } from "../people/employees";
import { toEmployeeView } from "../people/redact";
import { TASK_ORDER, TASK_SELECT, toSummary, type TaskRow } from
  "../tasks/task-rows";
import { createTasks } from "../tasks/tasks";
import { dubaiDate } from "../time/dubai";
import { expandTemplate } from "./expand";
import { getTemplate } from "./templates";
import { loadTerms, saveTerms, userOfEmployee } from "./terms";

type HireCtx = ReqCtx<HireRequest, unknown, { id: string }>;
interface Claim { employee_id: string; flow_id: string }

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

async function existingClaim(ctx: ReqCtx, offerId: string) {
  const [r] = await ctx.tx.query<Claim>(
    `SELECT employee_id, flow_id FROM offer_hires WHERE company_id = $1
     AND offer_id = $2`, [co(ctx), offerId]);
  return r ?? null;
}

/** The hire's employee, terms and onboarding tasks as stored. */
async function resultOf(ctx: ReqCtx, c: Claim): Promise<HireResult> {
  const today = dubaiDate(ctx.deps.now());
  const e = await loadEmployee(ctx.tx, ctx.deps, co(ctx), c.employee_id);
  const tasks = await ctx.tx.query<TaskRow>(
    `${TASK_SELECT} AND t.flow_type = 'onboarding' AND t.flow_id = $2
     ${TASK_ORDER}`, [co(ctx), c.flow_id]);
  return { employee: toEmployeeView(e, ctx.tenant!, today),
    terms: (await loadTerms(ctx.tx, co(ctx), e.id))!,
    flowId: c.flow_id, tasks: tasks.map((t) => toSummary(t, today)) };
}

/**
 * The application is still at `offer` and the requisition open
 * (review M-8): a withdrawn application or cancelled requisition is
 * never hired.
 */
async function assertStillHiring(ctx: ReqCtx, o: OfferRow) {
  const [r] = await ctx.tx.query<{ stage: string; status: string }>(
    `SELECT a.stage, r.status FROM applications a JOIN requisitions r
       ON r.company_id = a.company_id AND r.id = a.requisition_id
     WHERE a.company_id = $1 AND a.id = $2`, [co(ctx), o.applicationId]);
  if (r!.stage !== "offer") throw new ApiError("APPLICATION_CLOSED");
  if (r!.status !== "open") throw new ApiError("REQUISITION_NOT_OPEN");
}

/** Claims the offer; null when another request already did. */
async function claim(ctx: ReqCtx, offerId: string): Promise<Claim | null> {
  const rows = await ctx.tx.query<Claim>(
    `INSERT INTO offer_hires (company_id, offer_id, employee_id, flow_id,
       created_at) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING RETURNING employee_id, flow_id`,
    [co(ctx), offerId, ctx.deps.newId(), ctx.deps.newId(),
      ctx.deps.now().toISOString()]);
  return rows[0] ?? null;
}

function employeeBody(o: OfferRow, b: HireRequest): EmployeeCreate {
  const e: EmployeeCreate = { ...b, fullName: o.candidateName,
    jobTitle: o.jobTitle, joiningDate: o.startDate };
  if (o.departmentId !== null) e.departmentId = o.departmentId;
  if (o.managerId !== null) e.managerId = o.managerId;
  return e;
}

async function makeEmployee(ctx: HireCtx, o: OfferRow, c: Claim) {
  await createEmployee(ctx, employeeBody(o, ctx.body), c.employee_id);
  await setSalary(ctx, c.employee_id, { components: o.salary.map((s) => ({
    code: s.code, label: s.label, labelAr: s.labelAr,
    amount: toMoney(s.amount), sifBucket: s.sifBucket })) });
}

async function onboard(ctx: HireCtx, o: OfferRow, c: Claim) {
  const flow = { type: "onboarding" as const, id: c.flow_id };
  const t = await getTemplate(ctx.tx, co(ctx), "onboarding");
  await ctx.tx.query(
    `INSERT INTO onboarding_flows (id, company_id, employee_id, offer_id,
       template_version, started_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [c.flow_id, co(ctx), c.employee_id, o.id, t.version,
      ctx.deps.now().toISOString()]);
  const mgr = await userOfEmployee(ctx.tx, co(ctx), o.managerId);
  const made = await createTasks(ctx.tx, ctx.deps, co(ctx), ctx.user!.id,
    expandTemplate(t, o.startDate, { managerUserId: mgr,
      employeeUserId: null }, { employeeId: c.employee_id, flow,
      source: "onboarding-template" }));
  const terms = await saveTerms(ctx, c.employee_id, { probationMonths:
    o.probationMonths, contractNoticeDays: o.contractNoticeDays }, flow);
  return made.length + terms.tasks.length;
}

async function closeHiring(ctx: HireCtx, o: OfferRow, c: Claim) {
  await ctx.tx.query(
    `UPDATE offers SET status = 'hired', employee_id = $3
     WHERE company_id = $1 AND id = $2`, [co(ctx), o.id, c.employee_id]);
  const a = await appAccess(ctx, o.applicationId, true);
  await setStage(ctx, a.row, "hired", null);
  await ctx.tx.query(
    `UPDATE requisitions SET hired_count = hired_count + 1,
       status = CASE WHEN hired_count + 1 >= headcount THEN 'filled'
         ELSE status END
     WHERE company_id = $1 AND id = $2`, [co(ctx), o.requisitionId]);
}

/**
 * Offer to employee in the request's one transaction. The offer row is
 * locked and a claim row inserted first, so a retry (or a concurrent
 * call) gets 200 with the same hire; an error after the claim (e.g.
 * EMPLOYEE_NUMBER_TAKEN) rolls everything back (Ruling 21).
 */
export async function hireFromOffer(ctx: HireCtx) {
  const o = await loadOffer(ctx.tx, ctx.deps, co(ctx), ctx.params.id, true);
  const done = await existingClaim(ctx, o.id);
  if (done !== null) return new Reply(200, await resultOf(ctx, done));
  if (o.status !== "accepted") throw new ApiError("OFFER_NOT_ACCEPTED");
  await assertStillHiring(ctx, o);
  const c = await claim(ctx, o.id);
  if (c === null) {
    return new Reply(200, await resultOf(ctx, (await existingClaim(ctx,
      o.id))!));
  }
  await makeEmployee(ctx, o, c);
  const taskCount = await onboard(ctx, o, c);
  await closeHiring(ctx, o, c);
  await auditFor(ctx, "offer", "offer.hired", o.id,
    { employeeId: c.employee_id });
  await auditFor(ctx, "onboarding", "onboarding.started", c.flow_id,
    { employeeId: c.employee_id, taskCount });
  return new Reply(201, await resultOf(ctx, c));
}
