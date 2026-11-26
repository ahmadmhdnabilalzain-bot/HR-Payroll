import type { App } from "../../src/http/context";
import type { Db } from "../../src/db/db";
import type { Seeded, SeedUser } from "./seed";
import { call, type Clock } from "./test-app";

type Ctx = { app: App; clock: Clock; deps: { db: Db } };

export interface TimeSeed {
  holidayId: string;
  siteId: string;
}

async function must(p: Promise<{ status: number; text: string; body: any }>,
  want: number, label: string) {
  const r = await p;
  if (r.status !== want) throw new Error(`${label} ${r.status} ${r.text}`);
  return r.body;
}

/**
 * Sessions last 8 hours; tests that move the clock by days keep the
 * seeded sessions alive (test-only, through the superuser handle).
 */
export async function keepSessions(ctx: Ctx): Promise<void> {
  await ctx.deps.db.query(
    "UPDATE sessions SET expires_at = '2099-01-01T00:00:00Z'");
}

/** Calls as a seeded user in the seeded company. */
export function asUser(ctx: Ctx, s: Seeded) {
  return (who: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, who.token, s.companyId, method, path, body);
}

/**
 * Rest day "wed" (an arbitrary fixture value, not a default), one
 * holiday "Company Day A" on 2026-03-20, one work site "Site A", and
 * site profiles for the seeded employee and the report.
 */
export async function seedTime(ctx: Ctx, s: Seeded): Promise<TimeSeed> {
  const as = asUser(ctx, s);
  await keepSessions(ctx);
  await must(as(s.hr, "PUT", "/v1/time/settings", { restDays: ["wed"] }),
    200, "settings");
  const h = await must(as(s.hr, "POST", "/v1/time/holidays", {
    date: "2026-03-20", name: "Company Day A", kind: "company" }), 201,
    "holiday");
  const site = await must(as(s.hr, "POST", "/v1/time/work-sites", {
    name: "Site A", point: { lat: 1.5, lng: 1.5 }, radiusM: 200 }), 201,
    "site");
  for (const e of [s.emp.manager, s.emp.report]) {
    await must(as(s.hr, "PUT", `/v1/employees/${e}/time-profile`, {
      workMode: "site", geofenceMode: "off", workSiteIds: [site.id],
      wfhTracked: false, shiftWorker: false }), 200, "profile");
  }
  return { holidayId: h.id, siteId: site.id };
}
