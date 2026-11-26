import { afterAll, describe, expect, it } from "vitest";
import { openPg } from "../src/db/pg";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { seedCompany } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LIMITS = { statementMs: 30_000, idleInTransactionMs: 400 };

/**
 * Re-review C-1: when PostgreSQL ends a session for idling in a
 * transaction, the checked-out client emits "error". Without a
 * listener that error is uncaught and takes the whole API process
 * down (vitest reports it as an unhandled error and fails the run).
 */
describe.skipIf(!ADMIN_URL)("idle-in-transaction kills", () => {
  afterAll(closeAll);

  it("fail the one transaction; the pool and process go on", async () => {
    const db = await openPg(ADMIN_URL!, { max: 1, runtime: true,
      limits: LIMITS });
    const tx = db.transaction(async (t) => {
      await t.query("SELECT 1");
      await sleep(1500);
      await t.query("SELECT 2");
    });
    await expect(tx).rejects.toThrow();
    await sleep(200);
    expect(await db.query("SELECT 1 AS one")).toEqual([{ one: 1 }]);
    await db.close();
  });

  it("a user-route body stalled past the timeout holds no transaction",
    async () => {
      const { db } = await freshPgPair(2, { runtime: true, limits: LIMITS });
      const ctx = await makeApp({ db, start: "2026-11-26T08:00:00.000Z" });
      const s = await seedCompany(ctx, "idle");
      const json = JSON.stringify({ password: "wrong password here" });
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      const body = new ReadableStream<Uint8Array>({
        async start(ctl) {
          ctl.enqueue(new TextEncoder().encode(json.slice(0, 5)));
          await gate;
          ctl.enqueue(new TextEncoder().encode(json.slice(5)));
          ctl.close();
        } });
      const stalled = ctx.app.request("/v1/auth/mfa/enrol", {
        method: "POST", body, duplex: "half", headers: {
          authorization: `Bearer ${s.employee.token}`,
          "content-type": "application/json",
          "content-length": String(json.length) } } as RequestInit);
      await sleep(1200);
      release();
      const r = await stalled;
      expect(r.status).toBeLessThan(500);
      const next = await call(ctx.app, s.owner.token, s.companyId, "GET",
        "/v1/employees");
      expect(next.status).toBe(200);
    });
});
