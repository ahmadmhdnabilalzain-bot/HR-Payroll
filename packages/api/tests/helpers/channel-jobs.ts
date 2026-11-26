import { dispatchDue } from "../../src/channels/dispatch";
import { withTenant } from "../../src/db/tenant";
import type { Enter } from "../../src/http/context";
import type { Seeded, SeedUser } from "./seed";
import { call, type makeApp } from "./test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

/** The jobs' tenant opener (main.ts builds the same one). */
export const enterOf = (ctx: Ctx): Enter => (t, fn) =>
  withTenant(ctx.deps.db, t, fn);

export const dispatch = (ctx: Ctx) => dispatchDue(enterOf(ctx), ctx.deps);

/** Rows of a company table, past RLS for that company. */
export function rowsOf<T = Record<string, unknown>>(ctx: Ctx,
  companyId: string, sql: string, args: unknown[] = []): Promise<T[]> {
  return withTenant(ctx.deps.db, { companyId, userId: null },
    (tx) => tx.query<T>(sql, args));
}

/** Turns WhatsApp (and optionally approvals) on for the company. */
export async function enableWhatsApp(ctx: Ctx, s: Seeded,
  over: Record<string, unknown> = {}) {
  const cur = await call(ctx.app, s.owner.token, s.companyId, "GET",
    "/v1/channel-settings");
  const r = await call(ctx.app, s.owner.token, s.companyId, "PUT",
    "/v1/channel-settings", { whatsappEnabled: true,
      whatsappApprovals: false, whatsappDailyCap: 200,
      whatsappHourlyPerUser: 20, emailEnabled: true, ...over,
      expectedVersion: cur.body.version });
  if (r.status !== 200) throw new Error(`settings ${r.status} ${r.text}`);
}

/** Opt-in with the code the fake WhatsApp outbox received. */
export async function optIn(ctx: Ctx, s: Seeded, u: SeedUser,
  phone: string) {
  const start = await call(ctx.app, u.token, s.companyId, "POST",
    "/v1/me/channels/whatsapp/opt-in", { phone, consentVersion: 1,
      agreed: true });
  if (start.status !== 200) throw new Error(`opt-in ${start.text}`);
  await dispatch(ctx);
  const sent = ctx.fakes.outbox.whatsapp.filter((m) =>
    m.toE164 === phone && "templateName" in m &&
    m.templateName === "verify_code_v1").at(-1);
  const code = (sent as { bodyParams: string[] }).bodyParams[0]!;
  const v = await call(ctx.app, u.token, s.companyId, "POST",
    "/v1/me/channels/whatsapp/verify", { code });
  if (v.status !== 200) throw new Error(`verify ${v.text}`);
  return v.body;
}

/** Sets the user's per-kind channel switches. */
export async function setPrefs(ctx: Ctx, s: Seeded, u: SeedUser,
  kind: string, p: { email: boolean; whatsapp: boolean },
  quiet = false) {
  const cur = await call(ctx.app, u.token, s.companyId, "GET",
    "/v1/me/notification-prefs");
  const { note: _n, ...body } = cur.body;
  body.kinds[kind] = p;
  body.quietHours.enabled = quiet;
  const r = await call(ctx.app, u.token, s.companyId, "PUT",
    "/v1/me/notification-prefs", body);
  if (r.status !== 200) throw new Error(`prefs ${r.text}`);
}
