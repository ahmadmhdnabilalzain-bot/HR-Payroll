import { AuditEventPage } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import {
  addOwner,
  march,
  postRun,
  seedCompany,
  type Seeded,
} from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

describe("audit routes", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Seeded;
  let b: Seeded;
  beforeAll(async () => {
    ctx = await makeApp();
    a = await seedCompany(ctx, "auda");
    b = await seedCompany(ctx, "audb");
    const owner2 = await addOwner(ctx, a);
    const run = await postRun(ctx, a.hr, a, "aud-1", march);
    await call(ctx.app, owner2.token, a.companyId, "POST",
      `/v1/pay-runs/${run.body.id}/approve`);
  });

  it("the chain verifies after the pay-run flow", async () => {
    const r = await call(ctx.app, a.owner.token, a.companyId, "GET",
      "/v1/audit-events/verify");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.checked).toBeGreaterThan(10);
  });

  it("a manager may not read the log", async () => {
    const r = await call(ctx.app, a.manager.token, a.companyId, "GET",
      "/v1/audit-events");
    expect(r.status).toBe(403);
  });

  it("pages newest first, only this company, no sensitive values",
    async () => {
      const first = await call(ctx.app, a.hr.token, a.companyId, "GET",
        "/v1/audit-events?limit=5");
      const page = AuditEventPage.parse(first.body);
      expect(page.items.length).toBe(5);
      const seqs = page.items.map((e) => e.seq);
      expect(seqs).toEqual([...seqs].sort((x, y) => y - x));
      const next = await call(ctx.app, a.hr.token, a.companyId, "GET",
        `/v1/audit-events?limit=200&before=${page.nextBefore}`);
      expect(next.body.items[0].seq).toBe(page.nextBefore! - 1);
      const all = [...page.items, ...next.body.items];
      const bEvents = await call(ctx.app, b.hr.token, b.companyId, "GET",
        "/v1/audit-events?limit=200");
      const bIds = new Set(bEvents.body.items.map((e: { id: string }) =>
        e.id));
      expect(all.some((e) => bIds.has(e.id))).toBe(false);
      const text = JSON.stringify(all);
      expect(text).not.toContain("7777.77");
      expect(text).not.toContain("AE0703");
    });
});
