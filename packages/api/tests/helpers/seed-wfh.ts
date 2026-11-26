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
