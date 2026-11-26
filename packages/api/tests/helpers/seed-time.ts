import type { App } from "../../src/http/context";
import type { Db } from "../../src/db/db";
import type { Seeded, SeedUser } from "./seed";
import { call, PASSWORD, type Clock } from "./test-app";

type Ctx = { app: App; clock: Clock; deps: { db: Db } };

export interface TimeSeed {
  holidayId: string;
  siteId: string;
  shiftId: string;
  annualTypeId: string;
  sickTypeId: string;
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
  // The report works hybrid and is tracked (tracking itself stays off).
  await must(as(s.hr, "PUT", `/v1/employees/${s.emp.report}/time-profile`,
    { workMode: "hybrid", geofenceMode: "off", workSiteIds: [site.id],
      wfhTracked: true, shiftWorker: false }), 200, "wfh profile");
  const shiftId = await seedRoster(ctx, s);
  return { holidayId: h.id, siteId: site.id, shiftId,
    ...await seedLeaveTypes(ctx, s) };
}

/**
 * "Type A" (annual, 30 days, monthly accrual) and "Type S" (sick; its
 * name is the health-type leak sentinel).
 */
async function seedLeaveTypes(ctx: Ctx, s: Seeded) {
  const as = asUser(ctx, s);
  const a = await must(as(s.hr, "POST", "/v1/leave-types", {
    name: "Type A", paid: true, annualDays: 30 }), 201, "type a");
  await must(as(s.hr, "PUT", `/v1/leave-types/${a.id}/policy`,
    policy({ payrollKind: "annual", accrual: "monthly" })), 200, "pol a");
  const sk = await must(as(s.hr, "POST", "/v1/leave-types", {
    name: SICK_SENTINEL, paid: true, annualDays: null }), 201, "type s");
  await must(as(s.hr, "PUT", `/v1/leave-types/${sk.id}/policy`,
    policy({ payrollKind: "sick" })), 200, "pol s");
  return { annualTypeId: a.id as string, sickTypeId: sk.id as string };
}

export const SICK_SENTINEL = "SickTypeSentinel";

/** A full policy body: Plan 9's defaults, then the overrides. */
export function policy(o: Record<string, unknown> = {}) {
  return { payrollKind: "other-paid", accrual: "upfront",
    joiningYearProRata: false, dayCount: "calendar", halfDays: false,
    carryOverMaxDays: null, carryOverExpiresMonths: null,
    minNoticeDays: 0, maxConsecutiveDays: null, allowNegative: false,
    ...o };
}

/**
 * "Shift A" 09:00 to 17:00 with a 60-minute break, published for the
 * manager and the report for March 2026, rest on Wednesdays.
 */
async function seedRoster(ctx: Ctx, s: Seeded): Promise<string> {
  const as = asUser(ctx, s);
  const tpl = await must(as(s.hr, "POST", "/v1/time/shifts", {
    name: "Shift A", start: "09:00", end: "17:00", breakMinutes: 60 }),
  201, "shift");
  const entries = [];
  for (let d = 1; d <= 31; d++) {
    const date = `2026-03-${String(d).padStart(2, "0")}`;
    const rest = (d + 3) % 7 === 0; // 2026-03-04 is a Wednesday
    for (const employeeId of [s.emp.manager, s.emp.report]) {
      entries.push({ employeeId, date, slot: rest ? { kind: "rest" }
        : { kind: "shift", shiftTemplateId: tpl.id } });
    }
  }
  await must(as(s.hr, "PUT", "/v1/time/roster", { entries }), 200,
    "roster");
  await must(as(s.hr, "POST", "/v1/time/roster/publish", {
    from: "2026-03-01", to: "2026-03-31" }), 200, "publish");
  return tpl.id as string;
}

/** A user (role employee, no MFA) linked to an existing employee. */
export async function linkUser(ctx: Ctx, s: Seeded, employeeId: string,
  name: string): Promise<SeedUser> {
  const email = `${name}@example.com`;
  const inv = await must(call(ctx.app, s.owner.token, s.companyId, "POST",
    "/v1/users/invite", { email, role: "employee", employeeId }), 201,
  "invite");
  const acc = await must(call(ctx.app, null, null, "POST",
    "/v1/auth/accept-invite", { setupToken: inv.setupToken,
      password: PASSWORD, displayName: name }), 200, "accept");
  await keepSessions(ctx);
  return { token: acc.token, userId: acc.user.id, email };
}
