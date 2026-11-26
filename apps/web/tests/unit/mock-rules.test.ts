import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import type { AppPayRunCreate } from "../../src/api/contract";
import { codeOf, mockApi } from "../helpers/mock";
import { DEMO_PASSWORD } from "../../src/api/mock/options";

const ANNUAL = "00000000-0000-4000-8000-000005000001";
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

describe("mock rules: separation of duties", () => {
  it("approve-refused-same-user", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test", "123456");
    const run = await m.api.createPayRun(joinerRun, "k1");
    expect(await codeOf(m.api.approvePayRun(run.id))).toBe("SOD_VIOLATION");
    await m.signIn("owner2@demo.test", "123456");
    const done = await m.api.approvePayRun(run.id);
    expect(done.status).toBe("approved");
    expect(done.approvedBy).toBe((await m.api.me()).user.id);
    const { events } = await m.api.listAuditEvents();
    expect(events[0]?.action).toBe("pay-run.approved");
    expect(await codeOf(m.api.approvePayRun(run.id))).toBe("RUN_NOT_DRAFT");
  });

  it("approve-needs-mfa", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const run = await m.api.createPayRun(joinerRun, "k1");
    await m.signIn("owner2@demo.test");
    expect(await codeOf(m.api.approvePayRun(run.id))).toBe("MFA_REQUIRED");
  });

  it("hr-cannot-approve", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    const [run] = await m.api.listPayRuns();
    expect(await codeOf(m.api.approvePayRun(run?.id ?? "")))
      .toBe("FORBIDDEN");
  });

  it("void-then-new-run-allowed", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const run = await m.api.createPayRun(joinerRun, "k1");
    expect((await m.api.voidPayRun(run.id)).status).toBe("void");
    expect((await m.api.createPayRun(joinerRun, "k2")).status)
      .toBe("draft");
  });
});

describe("mock rules: leave", () => {
  const create = (start: string, end: string, n = 4) =>
    ({ employeeId: emp(n), leaveTypeId: ANNUAL, startDate: start,
      endDate: end });

  it("create-approve-and-refusals", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const r = await m.api.createLeaveRequest(create("2026-12-01",
      "2026-12-03"));
    expect(r).toMatchObject({ days: 3, status: "pending" });
    expect(await codeOf(m.api.createLeaveRequest(create("2026-12-03",
      "2026-12-04")))).toBe("LEAVE_OVERLAP");
    expect(await codeOf(m.api.createLeaveRequest(create("2026-12-30",
      "2027-01-02")))).toBe("LEAVE_CROSSES_YEAR");
    expect(await codeOf(m.api.createLeaveRequest(create("2026-12-10",
      "2026-12-09")))).toBe("VALIDATION_FAILED");
    const ok = await m.api.approveLeave(r.id, { note: "fine" });
    expect(ok.status).toBe("approved");
    expect(await codeOf(m.api.rejectLeave(r.id, {})))
      .toBe("LEAVE_NOT_PENDING");
  });

  it("insufficient-balance", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    expect(await codeOf(m.api.createLeaveRequest(create("2026-01-01",
      "2026-02-15", 10)))).toBe("INSUFFICIENT_BALANCE");
    const [annual] = await m.api.listLeaveBalances(emp(3), 2026);
    expect(annual).toMatchObject({ entitledDays: 30, pendingDays: 5,
      remainingDays: 25, dayCountRule: "calendar-days-inclusive" });
  });

  it("manager-decides-reports-not-self", async () => {
    const m = mockApi();
    await m.signIn("manager@demo.test");
    const mine = await m.api.listLeaveRequests();
    expect(new Set(mine.map((l) => l.employeeId)))
      .toEqual(new Set([emp(5), emp(6), emp(7)]));
    const own = await m.api.createLeaveRequest(create("2026-12-07",
      "2026-12-08", 2));
    expect(await codeOf(m.api.approveLeave(own.id, {})))
      .toBe("SOD_VIOLATION");
    expect(await codeOf(m.api.createLeaveRequest(create("2026-12-07",
      "2026-12-08", 4)))).toBe("NOT_FOUND");
  });

  it("year-filter-in-client", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    expect((await m.api.listLeaveRequests({ year: 2025 }))).toEqual([]);
    expect((await m.api.listLeaveRequests({ status: "pending" })))
      .toHaveLength(2);
  });

  it("attendance-in-dubai-hours", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    const recs = await m.api.listAttendance({ from: "2026-11-26",
      to: "2026-11-26" });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]).toMatchObject({ clockIn: "2026-11-26T05:00:00Z",
      clockOut: null, minutes: null });
  });
});

describe("mock rules: files, users, audit", () => {
  async function approvedNovember(m: ReturnType<typeof mockApi>) {
    await m.signIn("hr@demo.test");
    const run = await m.api.createPayRun(joinerRun, "k1");
    await m.signIn("owner2@demo.test", "123456");
    return m.api.approvePayRun(run.id);
  }

  it("bank-missing-lists-all", async () => {
    const m = mockApi({ seedPatch: (s) => ({ ...s,
      employees: s.employees.map((e, i) => i < 2 ? { ...e, iban: null,
        bank: null } : e) }) });
    const run = await approvedNovember(m);
    const e = await m.api.createSif(run.id).catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "EMPLOYEE_BANK_MISSING",
      detail: { employeeIds: [emp(1), emp(2)] } });
  });

  it("wps-settings-missing", async () => {
    const m = mockApi({ seedPatch: (s) => ({ ...s, company: { ...s.company,
      wps: { employerId: null, bankRoutingCode: null } } }) });
    const run = await approvedNovember(m);
    expect(await codeOf(m.api.createSif(run.id)))
      .toBe("COMPANY_WPS_SETTINGS_MISSING");
  });

  it("new-file-has-no-errors", async () => {
    const m = mockApi();
    const run = await approvedNovember(m);
    const file = await m.api.createSif(run.id);
    expect(file.errorCount).toBe(0);
    expect(file.warningCount).toBe(0);
    expect(file.fileName).toMatch(/^0000000123456261126\d{6}\.SIF$/);
    const text = await m.api.downloadSif(file.id);
    expect(text.split("\r\n").filter((l) => l.startsWith("EDR")))
      .toHaveLength(11);
  });

  it("invite-and-mfa", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const enrol = await m.api.mfaEnrol(DEMO_PASSWORD);
    expect(enrol.otpauthUrl).toContain(enrol.secret);
    expect(await codeOf(m.api.mfaConfirm("000000", DEMO_PASSWORD)))
      .toBe("MFA_CODE_INVALID");
    const me = await m.api.mfaConfirm("123456", DEMO_PASSWORD);
    expect(me.user.mfaEnrolled).toBe(true);
    await m.signIn("owner@demo.test");
    const inv = await m.api.inviteUser({ email: "new@demo.test",
      role: "hr" });
    expect(inv.setupToken.length).toBeGreaterThan(0);
    expect(await codeOf(m.api.inviteUser({ email: "hr@demo.test",
      role: "hr" }))).toBe("ALREADY_MEMBER");
    expect((await m.api.listUsers()).map((u) => u.role))
      .toEqual(["owner", "owner", "hr", "manager", "employee"]);
  });

  it("audit-paging", async () => {
    const m = mockApi({ signInAs: "owner@demo.test" });
    const first = await m.api.listAuditEvents({ limit: 2 });
    expect(first.events.map((e) => e.seq)).toEqual([4, 3]);
    const next = await m.api.listAuditEvents({ limit: 2,
      before: first.nextBefore ?? 0 });
    expect(next).toMatchObject({ nextBefore: null });
    expect(next.events.map((e) => e.seq)).toEqual([2, 1]);
  });

  it("payslip-read-own-only", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const [run] = await m.api.listPayRuns();
    const slips = await m.api.listPayslips(run?.id ?? "");
    const own = slips.find((x) => x.employeeId === emp(8));
    const other = slips.find((x) => x.employeeId === emp(5));
    await m.signIn("employee@demo.test");
    expect((await m.api.getPayslip(own?.id ?? "")).employeeId)
      .toBe(emp(8));
    expect(await codeOf(m.api.getPayslip(other?.id ?? "")))
      .toBe("NOT_FOUND");
    await m.signIn("manager@demo.test");
    expect(await codeOf(m.api.getPayslip(other?.id ?? "")))
      .toBe("NOT_FOUND");
  });

  it("audit-action-names", async () => {
    const m = mockApi({ signInAs: "owner2@demo.test" });
    const id = (await m.api.listEmployees())[0]?.id ?? "";
    await m.api.revealBank(id);
    const r = await m.api.createLeaveRequest({ employeeId: emp(4),
      leaveTypeId: ANNUAL, startDate: "2026-12-01",
      endDate: "2026-12-02" });
    await m.api.approveLeave(r.id, {});
    const { events } = await m.api.listAuditEvents({ limit: 3 });
    expect(events.map((e) => e.action)).toEqual(["leave.approved",
      "leave.requested", "employee.bank.revealed"]);
  });
});
