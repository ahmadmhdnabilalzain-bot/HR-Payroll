import { EXIT_FLAG_ONLY, NOTICE_FLAG_TEXT } from "@payroll/contract";
import { calculateNotice, EMPLOYMENT_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { salaryOf, seedCompany, type Seeded, type SeedUser } from
  "./helpers/seed";
import { seedHr } from "./helpers/seed-hr";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let n = 100;

const P = EMPLOYMENT_PACKS[0]!.params;
const MIN = P.empNoticeMinDays!.value as number;
const MAX_PROBATION = P.empProbationMaxMonths!.value as number;
const GIVEN = "2026-03-01";
const REASON = "Personal reasons, moving abroad";
const inputs = { unusedLeaveDays: 10, serviceUnpaidLeaveDays: 0 };

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

async function must(p: ReturnType<typeof by>, want = 200) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

/** An employee with a salary and (unless `months` is null) terms. */
async function staff(o: { joined?: string; months?: number | null;
  workerClass?: string; nationality?: string } = {}): Promise<string> {
  const e = await must(by(s.hr, "POST", "/v1/employees", {
    number: `X-${n++}`, fullName: "Leaver", jobTitle: "Clerk",
    nationality: o.nationality ?? "IN",
    workerClass: o.workerClass ?? "expat-full-time",
    joiningDate: o.joined ?? "2019-01-01", managerId: s.emp.manager }),
  201);
  await must(by(s.hr, "PUT", `/v1/employees/${e.id}/salary`,
    salaryOf("4000.00")));
  if (o.months !== null) {
    await must(by(s.hr, "PUT", `/v1/employees/${e.id}/terms`,
      { probationMonths: o.months ?? 0, contractNoticeDays: MIN }));
  }
  return e.id;
}

const open = (u: SeedUser, employeeId: string, kind = "resignation",
  extra = {}) => by(u, "POST", "/v1/exits", { employeeId, kind,
  noticeGivenDate: GIVEN, reason: REASON, ...extra });

/** An exit by hr, approved by the owner. */
async function approved(employeeId: string, kind = "resignation") {
  const x = await must(open(s.hr, employeeId, kind), 201);
  return must(by(s.owner, "POST", `/v1/exits/${x.id}/decision`,
    { approve: true }));
}

const audits = () => withTenant(ctx.deps.db, { companyId: s.companyId,
  userId: null }, (tx) => tx.query("SELECT action, data FROM audit_events"));

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "exits");
  await seedHr(ctx, s);
});

describe("exit request and notice", () => {
  it("exit_employee_resigns_self", async () => {
    const agreed = MIN - 10;
    // Only owner or hr may record an agreed notice (review M-3).
    const r = await by(s.hr, "POST", "/v1/exits", { kind: "resignation",
      employeeId: s.emp.report, noticeGivenDate: GIVEN,
      agreedNoticeDays: agreed, reason: REASON });
    expect(r.status, r.text).toBe(201);
    const want = calculateNotice({ kind: "resignation",
      joiningDate: "2019-01-01", noticeGivenDate: GIVEN,
      probationEndDate: null, contractNoticeDays: MIN,
      agreedNoticeDays: agreed }, EMPLOYMENT_PACKS);
    expect(r.body.employeeId).toBe(s.emp.report);
    expect(r.body.noticeDays).toBe(want.value.noticeDays);
    expect(r.body.lastWorkingDate).toBe(want.value.lastWorkingDate);
    expect(r.body.settlementDueDate).toBe(want.value.settlementDueDate);
    expect(r.body.flags).toEqual(want.value.flags.map((code) =>
      ({ code, text: NOTICE_FLAG_TEXT[code] })));
    expect(r.body.flags.length).toBe(1);
    expect(r.body.noticeTrace).toEqual(want.trace);
    expect(r.body.status).toBe("requested");
  });

  it("exit_employee_cannot_terminate", async () => {
    const r = await by(s.employee, "POST", "/v1/exits",
      { kind: "termination", noticeGivenDate: GIVEN });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
  });

  it("exit_manager_cannot_create_for_report", async () => {
    const r = await open(s.manager, s.emp.report2);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
  });

  it("exit_needs_terms", async () => {
    const r = await open(s.hr, await staff({ months: null }));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("EMPLOYMENT_TERMS_REQUIRED");
  });

  it("exit_in_probation_kind_refused", async () => {
    const id = await staff({ joined: "2026-01-15", months: MAX_PROBATION });
    const r = await open(s.hr, id);
    expect(r.status).toBe(422);
    expect(r.body.error.detail.engineCode).toBe("EXIT_KIND_IN_PROBATION");
  });

  it("exit_one_open_per_employee", async () => {
    const id = await staff();
    await must(open(s.hr, id), 201);
    const r = await open(s.hr, id);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EXIT_EXISTS");
  });

  it("exit_requester_cannot_approve", async () => {
    const x = await must(open(s.hr, await staff(), "termination"), 201);
    const r = await by(s.hr, "POST", `/v1/exits/${x.id}/decision`,
      { approve: true });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("SOD_VIOLATION");
  });
});

describe("approval, settlement and withdrawal", () => {
  it("exit_approve_sets_last_day_and_tasks", async () => {
    const id = await staff();
    const x = await approved(id, "termination");
    expect(x.status).toBe("in-notice");
    const e = await must(by(s.hr, "GET", `/v1/employees/${id}`));
    expect(e.lastWorkingDate).toBe(x.lastWorkingDate);
    const t = await must(by(s.hr, "GET",
      `/v1/tasks?flowType=exit&flowId=${x.id}`));
    const tpl = await must(by(s.hr, "GET", "/v1/checklist-templates"));
    const items = tpl.items.find((i: { kind: string }) =>
      i.kind === "exit").items.length;
    expect(t.items.length).toBe(items + 1);
    const due = t.items.find((i: { source: string }) =>
      i.source === "exit-deadline");
    expect(due.dueDate).toBe(x.settlementDueDate);
    expect(due.assigneeRole).toBe("hr");
    const rules = Object.fromEntries(due.rule.rules.map(
      (r: { key: string; status: string }) => [r.key, r.status]));
    expect(rules.empSettlementDueDays).toBe("official");
    expect(rules.empSettlementTrigger).toBe("convention");
  });

  it("exit_settlement_before_approval_409", async () => {
    const x = await must(open(s.hr, await staff()), 201);
    const r = await by(s.hr, "POST", `/v1/exits/${x.id}/settlement`,
      inputs);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EXIT_NOT_APPROVED");
  });

  it("exit_settlement_refused_not_500", async () => {
    const id = await staff({ workerClass: "gcc-national",
      nationality: "SA" });
    const x = await approved(id);
    const r = await by(s.hr, "POST", `/v1/exits/${x.id}/settlement`,
      inputs);
    expect(r.status, r.text).toBe(200);
    expect(r.body.settlement.settlement.status).toBe("refused");
    expect(r.body.settlement.flagOnly).toEqual([...EXIT_FLAG_ONLY]);
  });

  it("exit_settlement_same_for_resignation_and_termination", async () => {
    const a = await approved(await staff(), "resignation");
    const b = await approved(await staff(), "termination");
    const ra = await must(by(s.hr, "POST", `/v1/exits/${a.id}/settlement`,
      inputs));
    const rb = await must(by(s.hr, "POST", `/v1/exits/${b.id}/settlement`,
      inputs));
    expect(ra.settlement.settlement.status).toBe("computed");
    expect(ra.settlement.settlement.total)
      .toBe(rb.settlement.settlement.total);
  });

  it("exit_settlement_flag_only_listed", async () => {
    const x = await approved(await staff());
    const r = await must(by(s.hr, "POST", `/v1/exits/${x.id}/settlement`,
      inputs));
    const st = r.settlement;
    expect(st.flagOnly).toEqual([...EXIT_FLAG_ONLY]);
    const cents = (m: string) => Math.round(Number(m) * 100);
    expect(cents(st.settlement.total)).toBe(cents(st.settlement.gratuity) +
      cents(st.settlement.leavePay));
    expect(st.inputs).toEqual({ ...inputs, salaryVersion: 1 });
    expect(st.dueDate).toBe(x.settlementDueDate);
    expect(st.dueTrace.id).toBe("employment.settlement.due");
    const again = await must(by(s.hr, "POST",
      `/v1/exits/${x.id}/settlement`, inputs));
    expect(again.settlement.version).toBe(2);
  });

  it("exit_settlement_hidden_from_manager", async () => {
    const mine = (await must(by(s.employee, "GET", "/v1/exits"))).items;
    const x = mine[0];
    await must(by(s.owner, "POST", `/v1/exits/${x.id}/decision`,
      { approve: true }));
    const r = await must(by(s.hr, "POST", `/v1/exits/${x.id}/settlement`,
      inputs));
    const total = r.settlement.settlement.total as string;
    const m = await by(s.manager, "GET", `/v1/exits/${x.id}`);
    expect(m.status).toBe(200);
    expect(m.body.settlement).toBeNull();
    expect(m.body.reason).toBeNull();
    expect(m.text).not.toContain(total);
    expect(m.text).not.toContain(REASON);
    const self = await must(by(s.employee, "GET", `/v1/exits/${x.id}`));
    expect(self.settlement.settlement.total).toBe(total);
    expect(self.reason).toBe(REASON);
  });

  it("exit_withdraw_after_approval_restores", async () => {
    const id = await staff();
    const x = await approved(id);
    const w = await must(by(s.hr, "POST", `/v1/exits/${x.id}/withdraw`));
    expect(w.status).toBe("withdrawn");
    const e = await must(by(s.hr, "GET", `/v1/employees/${id}`));
    expect(e.lastWorkingDate).toBeNull();
    const t = await must(by(s.hr, "GET",
      `/v1/tasks?flowType=exit&flowId=${x.id}`));
    expect(t.items.every((i: { status: string }) =>
      i.status === "cancelled")).toBe(true);
    const one = await must(by(s.hr, "GET", `/v1/tasks/${t.items[0].id}`));
    expect(one.comments.map((c: { body: string }) => c.body))
      .toContain("exit withdrawn");
    const twice = await by(s.hr, "POST", `/v1/exits/${x.id}/withdraw`);
    expect(twice.body.error.code).toBe("EXIT_NOT_OPEN");
  });

  it("exit_audit_no_amounts", async () => {
    const x = await approved(await staff());
    const r = await must(by(s.hr, "POST", `/v1/exits/${x.id}/settlement`,
      inputs));
    const text = JSON.stringify(await audits());
    expect(text).toContain("exit.settlement-computed");
    expect(text).not.toContain(r.settlement.settlement.total);
    expect(text).not.toContain(REASON);
  });
});
