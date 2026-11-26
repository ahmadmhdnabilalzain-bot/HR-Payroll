import { tokenHash } from "../../src/auth/session";
import type { Db } from "../../src/db/db";
import type { App } from "../../src/http/context";
import type { Seeded } from "./seed";
import { asUser } from "./seed-time";
import type { Clock } from "./test-app";

type Ctx = { app: App; clock: Clock; deps: { db: Db } };

/** A live session without MFA for an existing user (test-only). */
export async function plainSession(ctx: Ctx, userId: string)
  : Promise<string> {
  const token = `plain${userId.replace(/-/g, "")}`;
  await ctx.deps.db.query(
    `INSERT INTO sessions (token_hash, user_id, mfa, expires_at, created_at)
     VALUES ($1, $2, false, '2099-01-01T00:00:00Z', now())`,
    [tokenHash(token), userId]);
  return token;
}

async function must(p: Promise<{ status: number; text: string; body: any }>,
  want: number, label: string) {
  const r = await p;
  if (r.status !== want) throw new Error(`${label} ${r.status} ${r.text}`);
  return r.body;
}

export const WFH_SENTINEL = { lat: 1.234, lng: 1.432 };

/** The next whole minute at or after `d`. */
export const nextMinute = (d: Date) =>
  new Date(Math.ceil(d.getTime() / 60_000) * 60_000);

export const minutes = (start: Date, n: number, category = "documents") =>
  Array.from({ length: n }, (_, i) => ({ at: new Date(start.getTime() +
    i * 60_000).toISOString(), active: true, category }));

/**
 * Tracking on (retention 30), notice published, the report consents,
 * clocks in remote, uploads 10 active minutes and one location at
 * the sentinel. Returns the record and the first minute.
 */
export async function seedWfh(ctx: Ctx, s: Seeded) {
  const as = asUser(ctx, s);
  await enableWfh(ctx, s);
  await must(as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion: 1,
    decision: "granted" }), 200, "consent");
  const rec = await must(as(s.employee, "POST", "/v1/attendance/clock-in",
    { method: "web", workLocation: "remote" }), 201, "clock-in");
  const first = nextMinute(new Date(Date.parse(rec.clockIn)));
  ctx.clock.now = new Date(first.getTime() + 15 * 60_000);
  await must(as(s.employee, "POST", "/v1/wfh/activity", {
    attendanceId: rec.id, minutes: minutes(first, 10) }), 200, "activity");
  await must(as(s.employee, "POST", "/v1/wfh/location", {
    attendanceId: rec.id, at: first.toISOString(), ...WFH_SENTINEL,
    accuracyM: 20, source: "phone", indicatorShown: true }), 201, "loc");
  return { attendanceId: rec.id as string, first };
}

/**
 * Tracking on (retention `days`, an attested assessment), notice
 * version 1 published. Consent is left to the test.
 */
export async function enableWfh(ctx: Ctx, s: Seeded, days = 30) {
  const as = asUser(ctx, s);
  await must(as(s.owner, "PUT", "/v1/wfh/settings", { retentionDays: days,
    impactAssessment: { done: true, date: "2026-02-01" } }), 200, "set");
  await must(as(s.hr, "POST", "/v1/wfh/notices", {}), 201, "notice");
  return must(as(s.owner, "PUT", "/v1/wfh/settings", { enabled: true }),
    200, "enable");
}
