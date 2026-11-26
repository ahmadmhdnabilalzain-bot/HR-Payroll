import type {
  HolidayCreate,
  HolidayUpdate,
  SpecialPeriodCreate,
  SpecialPeriodUpdate,
  TimeProfileUpdate,
  TimeSettingsUpdate,
  WorkSiteCreate,
  WorkSiteUpdate,
} from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeRef } from "../leave/requests";
import { inScope, viewerScope } from "../people/redact";
import {
  createHoliday,
  createPeriod,
  listHolidays,
  listPeriods,
  updateHoliday,
  updatePeriod,
} from "../time/calendar";
import { audit, changedKeys, co, nowIso } from "../time/ctx";
import { loadProfile, putProfile } from "../time/profiles";
import { getTimeSettings, putTimeSettings } from "../time/settings";
import { createSite, listSites, updateSite } from "../time/sites";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;
type YearCtx = ReqCtx<unknown, { year: number }>;

async function putSettings(ctx: ReqCtx<TimeSettingsUpdate>) {
  const out = await putTimeSettings(ctx.tx, co(ctx), ctx.body, nowIso(ctx));
  await audit(ctx, "time.settings.updated", "time-settings", null,
    { changed: changedKeys(ctx.body) });
  return out;
}

async function newHoliday(ctx: ReqCtx<HolidayCreate>) {
  const h = await createHoliday(ctx.tx, co(ctx), ctx.deps.newId(),
    ctx.body);
  await audit(ctx, "holiday.created", "holiday", h.id, { date: h.date });
  return h;
}

async function editHoliday(ctx: IdCtx<HolidayUpdate>) {
  const h = await updateHoliday(ctx.tx, co(ctx), ctx.params.id, ctx.body);
  await audit(ctx, "holiday.updated", "holiday", h.id,
    { changed: changedKeys(ctx.body) });
  return h;
}

async function newPeriod(ctx: ReqCtx<SpecialPeriodCreate>) {
  const p = await createPeriod(ctx.tx, co(ctx), ctx.deps.newId(), ctx.body);
  await audit(ctx, "period.created", "special-period", p.id,
    { from: p.start, to: p.end });
  return p;
}

async function editPeriod(ctx: IdCtx<SpecialPeriodUpdate>) {
  const p = await updatePeriod(ctx.tx, co(ctx), ctx.params.id, ctx.body);
  await audit(ctx, "period.updated", "special-period", p.id,
    { changed: changedKeys(ctx.body) });
  return p;
}

async function newSite(ctx: ReqCtx<WorkSiteCreate>) {
  const s = await createSite(ctx.tx, co(ctx), ctx.deps.newId(), ctx.body);
  await audit(ctx, "site.created", "work-site", s.id);
  return s;
}

async function editSite(ctx: IdCtx<WorkSiteUpdate>) {
  const s = await updateSite(ctx.tx, co(ctx), ctx.params.id, ctx.body);
  await audit(ctx, "site.updated", "work-site", s.id,
    { changed: changedKeys(ctx.body) });
  return s;
}

async function scoped(ctx: IdCtx) {
  const ref = await employeeRef(ctx.tx, co(ctx), ctx.params.id);
  if (!inScope(viewerScope(ctx.tenant!), ref)) {
    throw new ApiError("NOT_FOUND");
  }
  return ref.id;
}

async function editProfile(ctx: IdCtx<TimeProfileUpdate>) {
  const id = await scoped(ctx);
  const p = await putProfile(ctx.tx, co(ctx), id, ctx.body);
  await audit(ctx, "profile.updated", "time-profile", id,
    { employeeId: id, changed: changedKeys(ctx.body) });
  return p;
}

export function registerTimeSettingsRoutes(app: App, deps: AppDeps) {
  register(app, deps, "getTimeSettings", (ctx) =>
    getTimeSettings(ctx.tx, co(ctx)));
  register(app, deps, "updateTimeSettings", putSettings);
  register(app, deps, "listHolidays", async (ctx: YearCtx) => ({
    items: await listHolidays(ctx.tx, co(ctx), ctx.query.year) }));
  register(app, deps, "createHoliday", newHoliday);
  register(app, deps, "updateHoliday", editHoliday);
  register(app, deps, "listSpecialPeriods", async (ctx: YearCtx) => ({
    items: await listPeriods(ctx.tx, co(ctx), ctx.query.year) }));
  register(app, deps, "createSpecialPeriod", newPeriod);
  register(app, deps, "updateSpecialPeriod", editPeriod);
  register(app, deps, "listWorkSites", async (ctx) => ({
    items: await listSites(ctx.tx, co(ctx)) }));
  register(app, deps, "createWorkSite", newSite);
  register(app, deps, "updateWorkSite", editSite);
  register(app, deps, "getTimeProfile", async (ctx: IdCtx) =>
    loadProfile(ctx.tx, co(ctx), await scoped(ctx)));
  register(app, deps, "updateTimeProfile", editProfile);
}
