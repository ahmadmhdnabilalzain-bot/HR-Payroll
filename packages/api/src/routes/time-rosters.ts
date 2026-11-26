import type {
  RosterPublish,
  RosterPut,
  RosterQuery,
  RotationApply,
  ShiftTemplateCreate,
  ShiftTemplateUpdate,
} from "@payroll/contract";
import { addDays } from "@payroll/engine";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { audit, changedKeys, co, nowIso } from "../time/ctx";
import { assertRange } from "../time/range";
import { rosterFlagsFor } from "../time/roster-flags";
import { readRoster } from "../time/roster-read";
import { readEntries, toRosterDay } from "../time/rosters";
import {
  assertRosterWriter,
  publishDrafts,
  writeDrafts,
  type DraftEntry,
} from "../time/roster-write";
import {
  createTemplate,
  listTemplates,
  toTemplate,
  updateTemplate,
} from "../time/shifts";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

async function newShift(ctx: ReqCtx<ShiftTemplateCreate>) {
  const s = await createTemplate(ctx.tx, co(ctx), ctx.deps.newId(),
    ctx.body);
  await audit(ctx, "shift.created", "shift-template", s.id);
  return s;
}

async function editShift(ctx: IdCtx<ShiftTemplateUpdate>) {
  const s = await updateTemplate(ctx.tx, co(ctx), ctx.params.id, ctx.body);
  await audit(ctx, "shift.updated", "shift-template", s.id,
    { changed: changedKeys(ctx.body) });
  return s;
}

/** Writes drafts and answers the written days and their flags. */
async function saveDrafts(ctx: ReqCtx, entries: DraftEntry[]) {
  const ids = [...new Set(entries.map((e) => e.employeeId))];
  const dates = entries.map((e) => e.date).sort();
  const from = dates[0]!;
  const to = dates[dates.length - 1]!;
  assertRange(from, to);
  await assertRosterWriter(ctx.tx, ctx.tenant!, ids);
  await writeDrafts(ctx.tx, co(ctx), entries);
  const keys = new Set(entries.map((e) => `${e.employeeId}|${e.date}`));
  const days = (await readEntries(ctx.tx, co(ctx), ids, from, to))
    .filter((r) => keys.has(`${r.employee_id}|${r.date}`))
    .map((r) => toRosterDay(r, true));
  await audit(ctx, "roster.updated", "roster", null,
    { employeeCount: ids.length, from, to });
  return { days, flags: await rosterFlagsFor(ctx.tx, co(ctx), ids, from,
    to) };
}

function rotation(b: RotationApply): DraftEntry[] {
  const out: DraftEntry[] = [];
  for (const employeeId of b.employeeIds) {
    let i = 0;
    for (let d = b.from; d <= b.to; d = addDays(d, 1), i++) {
      const id = b.pattern[i % b.pattern.length] ?? null;
      out.push({ employeeId, date: d, slot: id === null
        ? { kind: "rest" } : { kind: "shift", shiftTemplateId: id } });
    }
  }
  return out;
}

async function publish(ctx: ReqCtx<RosterPublish>) {
  const b = ctx.body;
  assertRange(b.from, b.to);
  const t = ctx.tenant!;
  const ids = b.employeeIds ?? (await ctx.tx.query<{ id: string }>(
    `SELECT id FROM employees WHERE company_id = $1
     AND ($2::uuid IS NULL OR manager_id = $2) ORDER BY id`,
    [t.companyId, t.role === "manager" ? t.employeeId : null]))
    .map((r) => r.id);
  await assertRosterWriter(ctx.tx, t, ids);
  const published = await publishDrafts(ctx.tx, co(ctx), ids, b.from, b.to,
    nowIso(ctx));
  await audit(ctx, "roster.published", "roster", null,
    { employeeCount: ids.length, from: b.from, to: b.to,
      count: published });
  return { published, flags: await rosterFlagsFor(ctx.tx, co(ctx), ids,
    b.from, b.to) };
}

export function registerTimeRosterRoutes(app: App, deps: AppDeps) {
  register(app, deps, "listShiftTemplates", async (ctx) => ({
    items: (await listTemplates(ctx.tx, co(ctx))).map(toTemplate) }));
  register(app, deps, "createShiftTemplate", newShift);
  register(app, deps, "updateShiftTemplate", editShift);
  register(app, deps, "getRoster", async (ctx: ReqCtx<unknown,
    RosterQuery>) => ({ items: await readRoster(ctx.tx, ctx.tenant!,
    ctx.query) }));
  register(app, deps, "putRosterEntries", (ctx: ReqCtx<RosterPut>) =>
    saveDrafts(ctx, ctx.body.entries));
  register(app, deps, "applyRotation", (ctx: ReqCtx<RotationApply>) => {
    assertRange(ctx.body.from, ctx.body.to);
    return saveDrafts(ctx, rotation(ctx.body));
  });
  register(app, deps, "publishRoster", publish);
}
