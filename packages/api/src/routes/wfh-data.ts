import type {
  WfhActivityUpload,
  WfhLocationUpload,
} from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, type App, type Handler, type ReqCtx }
  from "../http/context";
import { ApiError } from "../http/errors";
import { employeeRef } from "../leave/requests";
import { inScope, viewerScope } from "../people/redact";
import { audit, co, selfEmployee } from "../time/ctx";
import { dubaiDate } from "../time/dubai";
import { assertRange } from "../time/range";
import { ingestActivity, ingestLocation } from "../wfh/ingest";
import { purgeExpiredWfh, wfhCutoff } from "../wfh/retention";
import {
  locationsIn,
  minutesIn,
  ownDays,
  wfhDayTotals,
} from "../wfh/views";

type Range = { from: string; to: string };

/** Retention runs at the start of every /v1/wfh/ handler (Ruling 20). */
export const purged = (h: Handler): Handler => async (ctx) => {
  await purgeExpiredWfh(ctx.tx, ctx.deps.now(), co(ctx), ctx.user!.id);
  return h(ctx);
};

async function myDays(ctx: ReqCtx<unknown, Range>) {
  assertRange(ctx.query.from, ctx.query.to);
  return { items: await ownDays(ctx.tx, co(ctx), selfEmployee(ctx),
    ctx.query.from, ctx.query.to, ctx.deps.now()) };
}

async function exportMine(ctx: ReqCtx) {
  const emp = selfEmployee(ctx);
  const now = ctx.deps.now();
  const cut = await wfhCutoff(ctx.tx, co(ctx), now);
  const consents = await ctx.tx.query<{ notice_version: number;
    decision: "granted" | "declined" | "withdrawn"; at: string }>(
    `SELECT notice_version, decision, at FROM wfh_consents
     WHERE company_id = $1 AND employee_id = $2 ORDER BY seq`,
    [co(ctx), emp]);
  const pauses = await ctx.tx.query<{ s: string; e: string | null }>(
    `SELECT started_at AS s, ended_at AS e FROM wfh_pauses
     WHERE company_id = $1 AND employee_id = $2 ORDER BY started_at`,
    [co(ctx), emp]);
  const today = dubaiDate(now);
  const from = cut === null ? today : dubaiDate(new Date(Date.parse(cut)));
  return { generatedAt: now.toISOString(), employeeId: emp,
    consents: consents.map((c) => ({ employeeId: emp,
      noticeVersion: c.notice_version, decision: c.decision, at: c.at })),
    pauses: pauses.map((p) => ({ startedAt: p.s, endedAt: p.e })),
    days: await ownDays(ctx.tx, co(ctx), emp, from, today, now),
    minutes: (await minutesIn(ctx.tx, co(ctx), emp, from, today, now))
      .map((m) => ({ at: m.at, active: m.active, category: m.category,
        attendanceId: m.attendance_id })) };
}

/** Employees the caller may see totals of (others 404 when named). */
async function summaryTargets(ctx: ReqCtx, one: string | undefined) {
  const scope = viewerScope(ctx.tenant!);
  if (one !== undefined) {
    const ref = await employeeRef(ctx.tx, co(ctx), one);
    if (!inScope(scope, ref)) throw new ApiError("NOT_FOUND");
    return [ref.id];
  }
  const rows = await ctx.tx.query<{ id: string; manager_id: string |
    null }>("SELECT id, manager_id FROM employees WHERE company_id = $1 " +
    "ORDER BY id", [co(ctx)]);
  return rows.filter((r) => inScope(scope, { id: r.id,
    managerId: r.manager_id })).map((r) => r.id);
}

/** Totals and a sample count only: no coordinate, no hourly detail. */
async function summary(ctx: ReqCtx<unknown, Range & { employeeId?:
  string }>) {
  const q = ctx.query;
  assertRange(q.from, q.to);
  const now = ctx.deps.now();
  const items = [];
  for (const emp of await summaryTargets(ctx, q.employeeId)) {
    const totals = await wfhDayTotals(ctx.tx, co(ctx), emp, q.from, q.to,
      now);
    const locs = await locationsIn(ctx.tx, co(ctx), emp, q.from, q.to, now);
    for (const [date, t] of [...totals].sort()) {
      items.push({ employeeId: emp, date, totals: t,
        locationSamples: locs.filter((l) => dubaiDate(new Date(
          Date.parse(l.at))) === date).length });
    }
  }
  return { items };
}

/** Owner and hr with MFA; every view is audited (count only). */
async function locations(ctx: ReqCtx<unknown, Range & {
  employeeId: string }>) {
  const q = ctx.query;
  assertRange(q.from, q.to);
  const ref = await employeeRef(ctx.tx, co(ctx), q.employeeId);
  const items = await locationsIn(ctx.tx, co(ctx), ref.id, q.from, q.to,
    ctx.deps.now());
  await audit(ctx, "wfh.locations.viewed", "wfh-data", null,
    { employeeId: ref.id, count: items.length });
  return { items };
}

export function registerWfhDataRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "postWfhActivity", purged((ctx) =>
    ingestActivity(ctx, ctx.body as WfhActivityUpload)));
  register(app, deps, "postWfhLocation", purged((ctx) =>
    ingestLocation(ctx, ctx.body as WfhLocationUpload)));
  register(app, deps, "getMyWfhDays", purged(myDays));
  register(app, deps, "exportMyWfhData", purged(exportMine));
  register(app, deps, "getWfhSummary", purged(summary));
  register(app, deps, "listWfhLocations", purged(locations));
}
