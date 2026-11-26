import type { WfhSettingsUpdate } from "@payroll/contract";
import type { AppDeps } from "../deps";
import {
  register,
  type App,
  type Handler,
  type ReqCtx,
} from "../http/context";
import { ApiError } from "../http/errors";
import { audit, changedKeys, co, nowIso, selfEmployee } from "../time/ctx";
import { dubaiDate } from "../time/dubai";
import { eraseOnWithdraw, recordConsent } from "../wfh/consent";
import { currentNotice, publishNotice } from "../wfh/notice";
import { lockEmployee, pause, resume } from "../wfh/pause";
import {
  assertEnablable,
  getWfhSettings,
  merge,
  saveWfhSettings,
} from "../wfh/settings";
import { currentWfhState, publicStatus } from "../wfh/status";
import { purged } from "./wfh-data";

/** Changing any of these republishes the notice (consent again). */
const NOTICE_KEYS = ["retentionDays", "activityCategories",
  "locationHourly", "legalReview"] as const;

async function putSettings(ctx: ReqCtx<WfhSettingsUpdate>) {
  const cur = await getWfhSettings(ctx.tx, co(ctx), true);
  const next = merge(cur, ctx.body);
  assertEnablable(next, dubaiDate(ctx.deps.now()));
  await saveWfhSettings(ctx.tx, co(ctx), next, nowIso(ctx));
  const bump = cur.noticeVersion !== null && NOTICE_KEYS.some((k) =>
    JSON.stringify(cur[k]) !== JSON.stringify(next[k]));
  if (bump) {
    const n = await publishNotice(ctx.tx, co(ctx), next, undefined,
      nowIso(ctx));
    await audit(ctx, "wfh.notice.published", "wfh-notice", null,
      { version: n.version });
  }
  await audit(ctx, "wfh.settings.updated", "wfh-settings", null,
    { changed: changedKeys(ctx.body) });
  return getWfhSettings(ctx.tx, co(ctx));
}

async function newNotice(ctx: ReqCtx<{ companyNote?: string }>) {
  const s = await getWfhSettings(ctx.tx, co(ctx), true);
  const n = await publishNotice(ctx.tx, co(ctx), s,
    ctx.body.companyNote ?? null, nowIso(ctx));
  await audit(ctx, "wfh.notice.published", "wfh-notice", null,
    { version: n.version });
  return n;
}

async function notice(ctx: ReqCtx) {
  const n = await currentNotice(ctx.tx, co(ctx));
  if (n === null) throw new ApiError("NOT_FOUND");
  return n;
}

async function withdraw(ctx: ReqCtx<{ erase: boolean }>) {
  const emp = selfEmployee(ctx);
  await lockEmployee(ctx.tx, co(ctx), emp);
  const consent = await recordConsent(ctx.tx, co(ctx), emp, null,
    "withdrawn", { id: ctx.deps.newId(), at: nowIso(ctx) });
  const erasedRows = ctx.body.erase
    ? await eraseOnWithdraw(ctx.tx, co(ctx), emp) : 0;
  await audit(ctx, "wfh.consent.withdrawn", "wfh-consent", null,
    { erased: ctx.body.erase, rows: erasedRows });
  return { consent, erasedRows };
}

async function consent(ctx: ReqCtx<{ noticeVersion: number;
  decision: "granted" | "declined" }>) {
  const emp = selfEmployee(ctx);
  await lockEmployee(ctx.tx, co(ctx), emp);
  const c = await recordConsent(ctx.tx, co(ctx), emp, ctx.body.noticeVersion,
    ctx.body.decision, { id: ctx.deps.newId(), at: nowIso(ctx) });
  await audit(ctx, `wfh.consent.${ctx.body.decision}`, "wfh-consent", null);
  return c;
}

const status = async (ctx: ReqCtx) => publicStatus(await currentWfhState(
  ctx.tx, ctx.deps.now(), co(ctx), selfEmployee(ctx)));

export function registerWfhRoutes(app: App, deps: AppDeps): void {
  const reg = (id: string, h: Handler) => register(app, deps, id,
    purged(h));
  reg("getWfhSettings", (ctx) =>
    getWfhSettings(ctx.tx, co(ctx)));
  reg("updateWfhSettings", putSettings);
  reg("publishWfhNotice", newNotice);
  reg("getCurrentWfhNotice", notice);
  reg("recordWfhConsent", consent);
  reg("withdrawWfhConsent", withdraw);
  reg("getWfhStatus", status);
  reg("pauseWfh", async (ctx) => {
    await pause(ctx, selfEmployee(ctx));
    return status(ctx);
  });
  reg("resumeWfh", async (ctx) => {
    await resume(ctx, selfEmployee(ctx));
    return status(ctx);
  });
}
