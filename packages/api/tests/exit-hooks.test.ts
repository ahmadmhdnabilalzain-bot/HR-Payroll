import { beforeAll, describe, expect, it } from "vitest";
import type { DocumentPort, DocumentRequest } from "../src/ports/documents";
import { exitFixtures } from "./helpers/exit-fixtures";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("document hook (default port)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let fx: ReturnType<typeof exitFixtures>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "docs");
    fx = exitFixtures(ctx, s);
  });

  it("documents_not_configured_by_default", async () => {
    const x = await fx.approvedExit(await fx.staff());
    await fx.settle(x.id);
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/documents`,
      { kinds: ["experience-certificate", "settlement-statement"],
        lang: "en" });
    expect(r.status, r.text).toBe(200);
    expect(r.body.documents.map((d: { kind: string; status: string }) =>
      [d.kind, d.status])).toEqual([
      ["experience-certificate", "not-configured"],
      ["settlement-statement", "not-configured"]]);
  });

  it("settlement_statement_needs_settlement", async () => {
    const x = await fx.approvedExit(await fx.staff());
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/documents`,
      { kinds: ["settlement-statement"], lang: "ar" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("SETTLEMENT_REQUIRED");
  });

  it("documents_need_an_approved_exit", async () => {
    const id = await fx.staff();
    const x = await fx.must(fx.by(s.hr, "POST", "/v1/exits", {
      employeeId: id, kind: "resignation", noticeGivenDate: "2026-03-01" }),
    201);
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/documents`,
      { kinds: ["experience-certificate"], lang: "en" });
    expect(r.body.error.code).toBe("EXIT_NOT_APPROVED");
  });

  it("close_blocked_by_open_tasks", async () => {
    const x = await fx.approvedExit(await fx.staff(), "2026-01-15");
    await fx.settle(x.id);
    await fx.must(fx.by(s.hr, "POST", `/v1/exits/${x.id}/revoke-access`, {}));
    const open = await fx.must(fx.by(s.hr, "GET",
      `/v1/tasks?flowType=exit&flowId=${x.id}&status=open`));
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/close`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CLEARANCE_OPEN");
    expect([...r.body.error.detail.taskIds].sort()).toEqual(
      open.items.map((t: { id: string }) => t.id).sort());
  });

  it("close_before_last_day_409", async () => {
    const x = await fx.approvedExit(await fx.staff());
    expect(x.lastWorkingDate > "2026-03-01").toBe(true);
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/close`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EXIT_BEFORE_LAST_DAY");
  });

  it("close_needs_settlement", async () => {
    const x = await fx.approvedExit(await fx.staff(), "2026-01-15");
    await fx.clearTasks(x.id);
    await fx.must(fx.by(s.hr, "POST", `/v1/exits/${x.id}/revoke-access`, {}));
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/close`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("SETTLEMENT_REQUIRED");
  });

  it("close_needs_access", async () => {
    const { employeeId } = await fx.withLogin();
    const x = await fx.approvedExit(employeeId, "2026-01-15");
    await fx.clearTasks(x.id);
    await fx.settle(x.id);
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/close`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("ACCESS_NOT_REVOKED");
  });

  it("close_happy_path", async () => {
    const { employeeId } = await fx.withLogin();
    const x = await fx.approvedExit(employeeId, "2026-01-15");
    await fx.clearTasks(x.id);
    await fx.settle(x.id);
    await fx.must(fx.by(s.hr, "POST", `/v1/exits/${x.id}/revoke-access`, {}));
    const r = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/close`);
    expect(r.status, r.text).toBe(200);
    expect(r.body.status).toBe("closed");
    expect(r.body.closedAt).toBe(ctx.clock.now.toISOString());
    const again = await fx.by(s.hr, "POST",
      `/v1/exits/${x.id}/settlement`,
      { unusedLeaveDays: 1, serviceUnpaidLeaveDays: 0 });
    expect(again.body.error.code).toBe("EXIT_NOT_APPROVED");
    const docs = await fx.by(s.hr, "POST", `/v1/exits/${x.id}/documents`,
      { kinds: ["experience-certificate"], lang: "en" });
    expect(docs.status).toBe(200);
  });
});

describe("document hook (spy and throwing ports)", () => {
  const seen: DocumentRequest[] = [];
  let fail = false;
  const spy: DocumentPort = { generate: async (r) => {
    seen.push(r);
    if (fail) throw new Error("renderer down");
    return { status: "generated", documentRef: `doc-${seen.length}` };
  } };
  let ctx: Ctx;
  let s: Seeded;
  let fx: ReturnType<typeof exitFixtures>;
  beforeAll(async () => {
    ctx = await makeApp({ documents: spy });
    s = await seedCompany(ctx, "spy");
    fx = exitFixtures(ctx, s);
  });

  it("document_port_gets_ids_only", async () => {
    const x = await fx.approvedExit(await fx.staff());
    const st = await fx.settle(x.id);
    const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/exits/${x.id}/documents`,
      { kinds: ["settlement-statement"], lang: "ar" });
    expect(r.status, r.text).toBe(200);
    expect(Object.keys(seen[0]!).sort()).toEqual(["companyId",
      "employeeId", "exitId", "kind", "lang"]);
    expect(JSON.stringify(seen))
      .not.toContain(st.settlement.settlement.total);
    expect(r.body.documents[0]).toMatchObject({ status: "generated",
      documentRef: "doc-1" });
  });

  it("document_port_throw_recorded_failed", async () => {
    const x = await fx.approvedExit(await fx.staff());
    fail = true;
    try {
      const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
        `/v1/exits/${x.id}/documents`,
        { kinds: ["experience-certificate"], lang: "en" });
      expect(r.status, r.text).toBe(200);
      expect(r.body.documents[0].status).toBe("failed");
    } finally {
      fail = false;
    }
  });
});
