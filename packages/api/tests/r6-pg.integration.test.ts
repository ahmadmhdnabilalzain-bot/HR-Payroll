import { afterAll, describe, expect, it } from "vitest";
import { openPg } from "../src/db/pg";
import { sweepUnclaimedFiles } from "../src/db/files-sweep";
import type { MemoryBlobStore } from "../src/storage/blob";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { seedCompany } from "./helpers/seed";
import { call, fakePdf, makeApp, upload } from "./helpers/test-app";

/** Review I-6 on real PostgreSQL, as the deployed roles. */
describe.skipIf(!ADMIN_URL)("uploads on real PostgreSQL", () => {
  afterAll(closeAll);

  it("the runtime pool sets statement and idle-transaction timeouts",
    async () => {
      const db = await openPg(ADMIN_URL!, { max: 1, runtime: true });
      const [a] = await db.query<{ t: string }>(
        "SELECT current_setting('statement_timeout') AS t");
      const [b] = await db.query<{ t: string }>(
        "SELECT current_setting('idle_in_transaction_session_timeout') AS t");
      await db.close();
      expect(a!.t).toBe("30s");
      expect(b!.t).toBe("15s");
    });

  it("the sweeper removes old unclaimed files of every company, as the " +
    "owner role under forced RLS", async () => {
    const { db, admin, owner } = await freshPgPair(4);
    const ctx = await makeApp({ db, start: "2026-11-26T08:00:00.000Z" });
    const a = await seedCompany(ctx, "sweepa");
    const b = await seedCompany(ctx, "sweepb");
    const old = await upload(ctx.app, a.hr.token, a.companyId, "o.pdf",
      fakePdf("old"));
    const oldB = await upload(ctx.app, b.hr.token, b.companyId, "o.pdf",
      fakePdf("oldb"));
    const kept = await upload(ctx.app, a.hr.token, a.companyId, "k.pdf",
      fakePdf("kept"));
    const r = await call(ctx.app, a.hr.token, a.companyId, "POST",
      `/v1/employees/${a.emp.report}/documents`, { type: "contract",
        fileId: kept.id });
    expect(r.status, r.text).toBe(201);
    // Age every file (test only; the write-once trigger is paused).
    await admin.exec("ALTER TABLE files DISABLE TRIGGER files_attach_once");
    await admin.query("UPDATE files SET uploaded_at = $1",
      ["2026-11-20T00:00:00Z"]);
    await admin.exec("ALTER TABLE files ENABLE TRIGGER files_attach_once");
    const fresh = await upload(ctx.app, a.hr.token, a.companyId, "f.pdf",
      fakePdf("fresh"));
    const n = await sweepUnclaimedFiles({ list: admin, owner,
      blobs: ctx.deps.blobs, now: () => ctx.clock.now, olderThanHours: 24 });
    expect(n).toBe(2);
    const left = (await admin.query<{ id: string }>("SELECT id FROM files"))
      .map((x) => x.id);
    expect(left).not.toContain(old.id);
    expect(left).not.toContain(oldB.id);
    expect(left).toContain(kept.id);
    expect(left).toContain(fresh.id);
    const keys = [...(ctx.deps.blobs as MemoryBlobStore).dump().keys()];
    expect(keys.some((k) => k.endsWith(old.id))).toBe(false);
    expect(keys.some((k) => k.endsWith(kept.id))).toBe(true);
  });
});
