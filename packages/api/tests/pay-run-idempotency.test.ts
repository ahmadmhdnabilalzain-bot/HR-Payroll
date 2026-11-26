import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { march, postRun, seedCompany, type Seeded } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

describe("pay-run idempotency (Review Focus 2)", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "idem");
  });
  const count = () => withTenant(ctx.deps.db, { companyId: s.companyId,
    userId: null }, (tx) => tx.query<{ n: bigint }>(
    "SELECT count(*) AS n FROM pay_runs WHERE year = 2026 AND month = 3"));

  it("one key sent twice at once makes one run", async () => {
    const [a, b] = await Promise.all([postRun(ctx, s.hr, s, "k-1", march),
      postRun(ctx, s.hr, s, "k-1", march)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.id).toBe(b.body.id);
    expect((await count())[0]?.n).toBe(1n);
  });

  it("refuses key reuse with another body and a second run", async () => {
    const other = await postRun(ctx, s.hr, s, "k-1", { ...march,
      entries: [{ employeeId: s.emp.report, oneOffs: [{ code: "bonus",
        label: "Bonus", amount: "1.00", sifBucket: "otherAllowances" }] }] });
    expect(other.status).toBe(409);
    expect(other.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    const second = await postRun(ctx, s.hr, s, "k-2", march);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("RUN_EXISTS_FOR_PERIOD");
  });

  it("after a void, a new key creates a run", async () => {
    const first = await postRun(ctx, s.hr, s, "k-1", march);
    const v = await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/pay-runs/${first.body.id}/void`);
    expect(v.body.status).toBe("void");
    const again = await postRun(ctx, s.hr, s, "k-3", march);
    expect(again.status, again.text).toBe(201);
    const replay = await postRun(ctx, s.hr, s, "k-1", march);
    expect(replay.status).toBe(200);
    expect(replay.body.status).toBe("void");
  });

  it("no header is 400 IDEMPOTENCY_KEY_REQUIRED", async () => {
    const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/pay-runs", march);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });
});
