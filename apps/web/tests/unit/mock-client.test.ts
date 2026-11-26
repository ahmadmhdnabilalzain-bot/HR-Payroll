import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { codeOf, mockApi } from "../helpers/mock";

describe("mock client: sessions and access", () => {
  it("login-without-totp-mfa-false", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test");
    const me = await m.api.me();
    expect(me.session.mfa).toBe(false);
    expect(me.memberships[0]?.role).toBe("owner");
  });

  it("login-with-totp", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test", "123456");
    expect((await m.api.me()).session.mfa).toBe(true);
    expect(await codeOf(m.signIn("owner@demo.test", "000000")))
      .toBe("INVALID_CREDENTIALS");
    expect(await codeOf(m.api.login({ email: "owner@demo.test",
      password: "wrong-password" }))).toBe("INVALID_CREDENTIALS");
  });

  it("mfa-required-on-approve", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test");
    const [run] = await m.api.listPayRuns();
    expect(await codeOf(m.api.approvePayRun(run?.id ?? "")))
      .toBe("MFA_REQUIRED");
    expect(await codeOf(m.api.revealBank(
      (await m.api.listEmployees())[0]?.id ?? ""))).toBe("MFA_REQUIRED");
  });

  it("mfa-enrolment-required-for-unenrolled", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const id = (await m.api.listEmployees())[0]?.id ?? "";
    expect(await codeOf(m.api.revealBank(id)))
      .toBe("MFA_ENROLMENT_REQUIRED");
  });

  it("role-forbidden", async () => {
    const m = mockApi();
    await m.signIn("manager@demo.test");
    expect(await codeOf(m.api.listPayRuns())).toBe("FORBIDDEN");
  });

  it("signed-out-is-unauthenticated", async () => {
    const m = mockApi();
    expect(await codeOf(m.api.listEmployees())).toBe("UNAUTHENTICATED");
  });

  it("failure-injection", async () => {
    const m = mockApi({ failures: new Set(["listEmployees"]) });
    await m.signIn("hr@demo.test");
    expect(await codeOf(m.api.listEmployees())).toBe("NETWORK");
    expect((await m.api.getCompany()).name).toContain("(demo)");
  });

  it("session-expires", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const { session } = await m.api.me();
    m.setNow(session.expiresAt);
    expect(await codeOf(m.api.listEmployees())).toBe("UNAUTHENTICATED");
  });

  it("sign-in-as-from-options", async () => {
    const m = mockApi({ signInAs: "hr@demo.test" });
    const me = await m.api.me();
    expect(me.user.email).toBe("hr@demo.test");
    expect(me.session.mfa).toBe(true);
  });
});

describe("mock client: seeds", () => {
  it("demo-seed", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const people = await m.api.listEmployees();
    expect(people).toHaveLength(12);
    expect(people.filter((p) => p.bank === null)).toHaveLength(1);
    expect(people.some((p) => p.fullName.startsWith("Sara"))).toBe(true);
    expect((await m.api.listDepartments())).toHaveLength(3);
  });

  it("manager-sees-reports-without-salary", async () => {
    const m = mockApi();
    await m.signIn("manager@demo.test");
    const people = await m.api.listEmployees();
    expect(people).toHaveLength(3);
    expect(people.every((p) => p.salary === null && p.bank === null))
      .toBe(true);
  });

  it("empty-seed", async () => {
    const m = mockApi({ seed: "empty" });
    await m.signIn("hr@demo.test");
    expect(await m.api.listEmployees()).toEqual([]);
    expect(await m.api.listPayRuns()).toEqual([]);
    expect(await m.api.listLeaveRequests()).toEqual([]);
  });

  it("large-seed", async () => {
    const m = mockApi({ seed: "large" });
    await m.signIn("hr@demo.test");
    const people = await m.api.listEmployees();
    expect(people).toHaveLength(250);
    expect(people.some((p) => p.fullName.length === 60)).toBe(true);
    const top = fils(999999999n);
    expect(people.some((p) =>
      p.salary?.some((c) => c.amount === top))).toBe(true);
  });

  it("seed-patch-applies", async () => {
    const m = mockApi({
      seedPatch: (s) => ({ ...s, company: { ...s.company,
        wps: { employerId: null, bankRoutingCode: null } } }),
    });
    await m.signIn("hr@demo.test");
    expect((await m.api.getCompany()).wps.employerId).toBeNull();
  });
});
