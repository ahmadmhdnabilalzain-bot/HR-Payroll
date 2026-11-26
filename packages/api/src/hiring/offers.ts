import type {
  Decision,
  OfferCreate,
  OfferResponse,
  OfferStatus,
} from "@payroll/contract";
import { assertDecidable } from "../approvals/assert-decidable";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { engineTerms } from "../onboarding/engine-terms";
import { checkSalary } from "../people/employee-writes";
import { sealerFor } from "../people/employees";
import {
  canSeeOffer,
  listOfferRows,
  loadOffer,
  toOfferView,
  type OfferRow,
} from "./offer-rows";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;
const viewer = (ctx: ReqCtx) => ({ role: ctx.tenant!.role,
  userId: ctx.user!.id });

async function visibleOffer(ctx: IdCtx, lock = false): Promise<OfferRow> {
  const o = await loadOffer(ctx.tx, ctx.deps, co(ctx), ctx.params.id, lock);
  if (!canSeeOffer(viewer(ctx), o)) throw new ApiError("NOT_FOUND");
  return o;
}

const view = async (ctx: ReqCtx, id: string) =>
  toOfferView(await loadOffer(ctx.tx, ctx.deps, co(ctx), id), viewer(ctx));

export async function listOffers(ctx: ReqCtx) {
  const rows = await listOfferRows(ctx.tx, ctx.deps, co(ctx));
  return { items: rows.filter((o) => canSeeOffer(viewer(ctx), o))
    .map((o) => toOfferView(o, viewer(ctx))) };
}

export async function getOffer(ctx: IdCtx) {
  return toOfferView(await visibleOffer(ctx), viewer(ctx));
}

async function refExists(ctx: ReqCtx, table: string, id: string | undefined,
  field: string) {
  if (id === undefined) return;
  const rows = await ctx.tx.query(
    `SELECT 1 FROM ${table} WHERE company_id = $1 AND id = $2`,
    [co(ctx), id]);
  if (rows.length === 0) {
    throw new ApiError("NOT_FOUND", undefined, { fields: [field] });
  }
}

async function checkCreate(ctx: ReqCtx<OfferCreate>) {
  const b = ctx.body;
  const [a] = await ctx.tx.query<{ stage: string }>(
    "SELECT stage FROM applications WHERE company_id = $1 AND id = $2",
    [co(ctx), b.applicationId]);
  if (a === undefined) throw new ApiError("NOT_FOUND");
  if (a.stage !== "offer") throw new ApiError("APPLICATION_NOT_AT_OFFER");
  checkSalary(b.salary);
  await refExists(ctx, "departments", b.departmentId, "body.departmentId");
  await refExists(ctx, "employees", b.managerId, "body.managerId");
}

/** Owner or hr. Legal limits come from the engine at `startDate`. */
export async function createOffer(ctx: ReqCtx<OfferCreate>) {
  const b = ctx.body;
  await checkCreate(ctx);
  const t = engineTerms(b.startDate, b.probationMonths,
    b.contractNoticeDays, b.startDate);
  const id = ctx.deps.newId();
  const s = await sealerFor(ctx.tx, ctx.deps, co(ctx), "offers");
  const rows = await ctx.tx.query(
    `INSERT INTO offers (id, company_id, application_id, job_title,
       department_id, manager_id, start_date, salary_enc, probation_months,
       probation_end_date, contract_notice_days, terms_trace, expires_on,
       note, status, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       'pending-approval', $15, $16)
     ON CONFLICT DO NOTHING RETURNING id`,
    [id, co(ctx), b.applicationId, b.jobTitle, b.departmentId ?? null,
      b.managerId ?? null, b.startDate,
      s.seal("salary_enc", id, JSON.stringify(b.salary)),
      b.probationMonths, t.probation.value.probationEndDate,
      b.contractNoticeDays, JSON.stringify(t.trace), b.expiresOn ?? null,
      b.note ?? null, ctx.user!.id, ctx.deps.now().toISOString()]);
  if (rows.length === 0) throw new ApiError("OFFER_EXISTS");
  await auditFor(ctx, "offer", "offer.created", id,
    { applicationId: b.applicationId });
  return view(ctx, id);
}

async function setStatus(ctx: ReqCtx, o: OfferRow, status: OfferStatus,
  action: string, extra: Record<string, unknown> = {}) {
  const cols = Object.keys(extra);
  const sets = cols.map((c, i) => `, ${c} = $${i + 4}`).join("");
  await ctx.tx.query(
    `UPDATE offers SET status = $3${sets} WHERE company_id = $1
     AND id = $2`, [co(ctx), o.id, status, ...Object.values(extra)]);
  await auditFor(ctx, "offer", action, o.id);
  return view(ctx, o.id);
}

/** Owner only, MFA session (route), never the offer's creator. */
export async function decideOffer(ctx: IdCtx<Decision>) {
  const o = await visibleOffer(ctx, true);
  assertDecidable(ctx, { status: o.status, requestedBy: o.createdBy },
    { pending: "pending-approval", roles: ["owner"] });
  const ok = ctx.body.approve;
  return setStatus(ctx, o, ok ? "approved" : "rejected",
    ok ? "offer.approved" : "offer.rejected", { decided_by: ctx.user!.id,
      decided_at: ctx.deps.now().toISOString(),
      decision_note: ctx.body.note ?? null });
}

/** Hr records the candidate's answer on an approved, unexpired offer. */
export async function recordResponse(ctx: IdCtx<OfferResponse>) {
  const o = await visibleOffer(ctx, true);
  if (o.status !== "approved") throw new ApiError("OFFER_NOT_APPROVED");
  const b = ctx.body;
  if (o.expiresOn !== null && b.respondedOn > o.expiresOn) {
    throw new ApiError("OFFER_EXPIRED");
  }
  return setStatus(ctx, o, b.accepted ? "accepted" : "declined",
    b.accepted ? "offer.accepted" : "offer.declined",
    { responded_on: b.respondedOn });
}

const WITHDRAWABLE: readonly OfferStatus[] = ["pending-approval",
  "approved", "accepted"];

export async function withdrawOffer(ctx: IdCtx) {
  const o = await visibleOffer(ctx, true);
  if (!WITHDRAWABLE.includes(o.status)) {
    throw new ApiError("OFFER_NOT_WITHDRAWABLE");
  }
  return setStatus(ctx, o, "withdrawn", "offer.withdrawn");
}
