import { calculateSettlement, GRATUITY_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { toMoney } from "../src/db/money";
import { exitFixtures } from "./helpers/exit-fixtures";
import { salaryOf, seedCompany, type Seeded } from "./helpers/seed";
import { addMember } from "./helpers/seed-hr";
import { makeApp } from "./helpers/test-app";

/** Plan 8 review I-2, I-4, I-5 and the cheap minors on exits. */
type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let fx: ReturnType<typeof exitFixtures>;
let n = 0;

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "subj");
  fx = exitFixtures(ctx, s);
});

const post = (u: { token: string }, path: string, body: unknown = {}) =>
  fx.by(u as never, "POST", path, body);

describe("the leaver cannot act on their own exit (I-2, I-4)", () => {
  it("subject_hr_refused_on_own_exit", async () => {
    const email = `subj${n++}@example.com`;
    const id = await fx.staff(email);
    const me = await addMember(ctx, s, email, "hr");
    const x = await fx.must(fx.by(s.owner, "POST", "/v1/exits", {
      employeeId: id, kind: "termination",
      noticeGivenDate: "2026-01-15" }), 201);
    const d = await post(me, `/v1/exits/${x.id}/decision`,
      { approve: false });
    expect(d.status).toBe(403);
    expect(d.body.error.code).toBe("SOD_VIOLATION");
    await fx.must(post(s.hr, `/v1/exits/${x.id}/decision`,
      { approve: true }));
    for (const [path, body] of [
      ["settlement", { unusedLeaveDays: 900, serviceUnpaidLeaveDays: 0 }],
      ["withdraw", {}], ["close", {}]] as const) {
      const r = await post(me, `/v1/exits/${x.id}/${path}`, body);
      expect(r.status, path).toBe(403);
      expect(r.body.error.code, path).toBe("SOD_VIOLATION");
    }
  });

  it("leaver_cannot_tick_own_clearance_task", async () => {
    const { employeeId, user } = await fx.withLogin();
    const x = await fx.approvedExit(employeeId);
    const t = await fx.must(fx.by(s.hr, "GET",
      `/v1/tasks?flowType=exit&flowId=${x.id}`));
    const ret = t.items.find((i: { title: string }) =>
      i.title.startsWith("Return laptop"));
    expect(ret.assigneeUserId).toBe(s.manager.userId);
    const mine = await fx.by(user, "PATCH", `/v1/tasks/${ret.id}`,
      { status: "done" });
    expect([403, 404]).toContain(mine.status);
  });

  it("employee_cannot_withdraw_hr_exit", async () => {
    const { employeeId, user } = await fx.withLogin();
    const x = await fx.must(fx.by(s.hr, "POST", "/v1/exits", {
      employeeId, kind: "resignation", noticeGivenDate: "2026-03-01" }),
    201);
    const r = await post(user, `/v1/exits/${x.id}/withdraw`);
    expect(r.status).toBe(403);
  });

  it("employee_withdraws_requested_but_not_approved_resignation",
    async () => {
      const { employeeId, user } = await fx.withLogin();
      const mk = () => post(user, "/v1/exits", { kind: "resignation",
        noticeGivenDate: "2026-03-01" });
      const a = await fx.must(mk(), 201);
      expect((await post(user, `/v1/exits/${a.id}/withdraw`)).status)
        .toBe(200);
      const b = await fx.must(mk(), 201);
      await fx.must(post(s.hr, `/v1/exits/${b.id}/decision`,
        { approve: true }));
      const w = await post(user, `/v1/exits/${b.id}/withdraw`);
      expect(w.status).toBe(403);
      expect(employeeId).toBeDefined();
    });

  it("self_service_cannot_agree_notice_or_back_date", async () => {
    const { user } = await fx.withLogin();
    const agreed = await post(user, "/v1/exits", { kind: "resignation",
      noticeGivenDate: "2026-03-01", agreedNoticeDays: 0 });
    expect(agreed.status).toBe(403);
    const back = await post(user, "/v1/exits", { kind: "resignation",
      noticeGivenDate: "2026-02-27" });
    expect(back.status).toBe(400);
  });
});

describe("money and dates are pinned (I-5, M-2)", () => {
  async function engineTotal(unused: number, unpaid: number,
    last: string) {
    const r = calculateSettlement({ gratuity: { joiningDate: "2019-01-01",
      lastWorkingDate: last, unpaidLeaveDays: unpaid,
      lastBasicMonthly: 400000n as never, workerClass: "expat-full-time" },
    unusedLeaveDays: unused }, GRATUITY_PACKS);
    return toMoney(r.value.total);
  }

  it("exit_settlement_api_uses_basic_and_wires_inputs", async () => {
    const x = await fx.approvedExit(await fx.staff());
    const r = await fx.must(post(s.hr, `/v1/exits/${x.id}/settlement`,
      { unusedLeaveDays: 10, serviceUnpaidLeaveDays: 30 }));
    expect(r.settlement.settlement.total)
      .toBe(await engineTotal(10, 30, x.lastWorkingDate));
    expect(r.settlement.settlement.total).not
      .toBe(await engineTotal(30, 10, x.lastWorkingDate));
  });

  it("revoke_requires_in_notice", async () => {
    const x = await fx.must(fx.by(s.hr, "POST", "/v1/exits", {
      employeeId: await fx.staff(), kind: "resignation",
      noticeGivenDate: "2026-03-01" }), 201);
    const r = await fx.revoke(x.id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EXIT_NOT_APPROVED");
  });

  it("close_on_last_day_ok_and_one_day_before_409", async () => {
    // Notice periods end exactly today (2026-03-01) and tomorrow.
    for (const [given, want] of [["2026-01-30", 200],
      ["2026-01-31", 409]] as const) {
      const x = await fx.approvedExit(await fx.staff(), given);
      await fx.clearTasks(x.id);
      await fx.settle(x.id);
      await fx.must(fx.revoke(x.id, s.hr));
      const r = await post(s.hr, `/v1/exits/${x.id}/close`);
      expect(r.status, `${given} ${x.lastWorkingDate}`).toBe(want);
    }
  });

  it("stale_settlement_blocks_close", async () => {
    const id = await fx.staff();
    const x = await fx.approvedExit(id, "2026-01-15");
    await fx.clearTasks(x.id);
    await fx.settle(x.id);
    await fx.must(fx.revoke(x.id, s.hr));
    await fx.must(fx.by(s.hr, "PUT", `/v1/employees/${id}/salary`,
      salaryOf("4500.00")));
    const r = await post(s.hr, `/v1/exits/${x.id}/close`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("SETTLEMENT_STALE");
    await fx.settle(x.id);
    expect((await post(s.hr, `/v1/exits/${x.id}/close`)).status).toBe(200);
  });
});
