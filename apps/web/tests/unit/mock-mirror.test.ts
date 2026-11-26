import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import type { AppPayRunCreate } from "../../src/api/contract";
import { DEMO_PASSWORD } from "../../src/api/mock/options";
import { codeOf, mockApi } from "../helpers/mock";

/** Behaviour the mock copies from packages/api (Plan 3 as built). */
const ANNUAL = "00000000-0000-4000-8000-000005000001";
const UNPAID = "00000000-0000-4000-8000-000005000003";
const user = (n: number): string =>
  `00000000-0000-4000-8000-${(2 * 0x1000000 + n).toString(16)
    .padStart(12, "0")}`;
const emp = (n: number): string =>
  `00000000-0000-4000-8000-${(3 * 0x1000000 + n).toString(16)
    .padStart(12, "0")}`;

const joinerRun: AppPayRunCreate = {
  period: { year: 2026, month: 11 },
  entries: [{ employeeId: emp(11), componentOverrides: [
    { code: "basic", amount: fils(400000n) },
    { code: "housing", amount: fils(150000n) },
  ] }],
};

describe("mock mirrors the api: users and MFA", () => {
  it("role-change-audited", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test", "123456");
    const row = await m.api.changeUserRole(user(3), "manager");
    expect(row).toMatchObject({ userId: user(3), role: "manager" });
    const { events } = await m.api.listAuditEvents({ limit: 1 });
    expect(events[0]).toMatchObject({ action: "user.role-changed",
      entityId: user(3), data: { from: "hr", to: "manager" } });
  });

  it("role-change-needs-mfa-and-owner", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test");
    expect(await codeOf(m.api.changeUserRole(user(3), "owner")))
      .toBe("MFA_REQUIRED");
    await m.signIn("hr@demo.test");
    expect(await codeOf(m.api.changeUserRole(user(3), "owner")))
      .toBe("FORBIDDEN");
  });

  it("last-owner-kept", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test", "123456");
    await m.api.changeUserRole(user(2), "hr");
    expect(await codeOf(m.api.changeUserRole(user(1), "hr")))
      .toBe("LAST_OWNER");
    expect(await codeOf(m.api.changeUserRole(
      "00000000-0000-4000-8000-0000000000ff", "hr"))).toBe("NOT_FOUND");
  });

  it("mfa-enrol-needs-password", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    expect(await codeOf(m.api.mfaEnrol("wrong-password")))
      .toBe("INVALID_CREDENTIALS");
    expect(await codeOf(m.api.mfaConfirm("123456", DEMO_PASSWORD)))
      .toBe("MFA_NOT_STARTED");
    await m.api.mfaEnrol(DEMO_PASSWORD);
    expect(await codeOf(m.api.mfaConfirm("123456", "wrong-password")))
      .toBe("INVALID_CREDENTIALS");
    const me = await m.api.mfaConfirm("123456", DEMO_PASSWORD);
    expect(me.session.mfa).toBe(false);
    const { events } = await m.api.listAuditEvents({ limit: 1 });
    expect(events[0]?.action).not.toMatch(/mfa/);
  });

  it("invite-audit", async () => {
    const m = mockApi({ signInAs: "owner@demo.test" });
    await m.api.inviteUser({ email: "new@demo.test", role: "manager" });
    const { events } = await m.api.listAuditEvents({ limit: 1 });
    expect(events[0]).toMatchObject({ action: "user.invited",
      entityType: "invite", data: { role: "manager" } });
  });
});

describe("mock mirrors the api: pay runs and files", () => {
  it("pay-run-audit-names", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const run = await m.api.createPayRun(joinerRun, "k1");
    await m.api.voidPayRun(run.id);
    const { events } = await m.api.listAuditEvents({ limit: 2 });
    expect(events.map((e) => e.action))
      .toEqual(["pay-run.voided", "pay-run.created"]);
    expect(events[1]?.data).toMatchObject({ period: { year: 2026,
      month: 11 }, employeeCount: 11, inputHash: run.inputHash });
    expect(events[0]?.data).toEqual({ period: { year: 2026, month: 11 } });
  });

  it("sif-file-id-on-run", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const run = await m.api.createPayRun(joinerRun, "k1");
    expect(run.sifFileId).toBeNull();
    const [, last] = await m.api.listPayRuns();
    expect(last?.sifFileId).not.toBeNull();
    const file = await m.api.getSifFile(last?.sifFileId ?? "");
    expect(file.payRunId).toBe(last?.id);
  });

  it("new-file-sets-sif-file-id", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const draft = await m.api.createPayRun(joinerRun, "k1");
    await m.signIn("owner2@demo.test", "123456");
    await m.api.approvePayRun(draft.id);
    const file = await m.api.createSif(draft.id);
    expect((await m.api.getPayRun(draft.id)).sifFileId).toBe(file.id);
  });

  it("inputs-changed-blocks-approval", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const run = await m.api.createPayRun(joinerRun, "k1");
    const req = await m.api.createLeaveRequest({ employeeId: emp(3),
      leaveTypeId: UNPAID, startDate: "2026-11-27",
      endDate: "2026-11-27" });
    await m.api.approveLeave(req.id, {});
    await m.signIn("owner2@demo.test", "123456");
    expect(await codeOf(m.api.approvePayRun(run.id)))
      .toBe("RUN_INPUTS_CHANGED");
  });

  it("salary-missing-problem", async () => {
    const m = mockApi({ seedPatch: (s) => ({ ...s,
      employees: s.employees.map((e, i) => i === 0 ? { ...e, salary: [] }
        : e) }) });
    await m.signIn("hr@demo.test");
    const e = await m.api.createPayRun(joinerRun, "k1")
      .catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "PAY_RUN_PROBLEMS" });
    expect((e as { problems: unknown[] }).problems).toContainEqual(
      { employeeId: emp(1), code: "SALARY_MISSING", missing: ["salary"] });
  });

  it("service-unpaid-leave-days-sent", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const body: AppPayRunCreate = { ...joinerRun, entries: [
      { ...joinerRun.entries[0]!, serviceUnpaidLeaveDays: 3 }] };
    const run = await m.api.createPayRun(body, "k1");
    expect(run.status).toBe("draft");
  });
});

describe("mock mirrors the api: leave", () => {
  it("year-filter-on-server", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    expect(await m.api.listLeaveRequests({ year: 2025 })).toEqual([]);
    expect((await m.api.listLeaveRequests({ year: 2026 })).length)
      .toBe(6);
  });

  it("payroll-cancels-approved", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    const approved = (await m.api.listLeaveRequests(
      { status: "approved" }))[0];
    const done = await m.api.cancelLeave(approved?.id ?? "");
    expect(done.status).toBe("cancelled");
    expect(await codeOf(m.api.cancelLeave(done.id)))
      .toBe("LEAVE_NOT_CANCELLABLE");
  });

  it("leave-audit-has-no-note", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    const r = await m.api.createLeaveRequest({ employeeId: emp(4),
      leaveTypeId: ANNUAL, startDate: "2026-12-01",
      endDate: "2026-12-01" });
    await m.api.approveLeave(r.id, { note: "private" });
    const { events } = await m.api.listAuditEvents({ limit: 2 });
    expect(events[0]?.data).toEqual({ employeeId: emp(4) });
    expect(events[1]?.data).toEqual({ employeeId: emp(4),
      leaveTypeId: ANNUAL, days: 1 });
  });
});
