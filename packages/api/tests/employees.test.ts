import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import {
  IBAN_SENTINEL,
  SALARY_SENTINEL,
  salaryOf,
  seedCompany,
  type Seeded,
} from "./helpers/seed";
import { call, login, makeApp, PASSWORD, signup } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("employees and departments", () => {
  let ctx: Ctx;
  let s: Seeded;
  const as = (who: keyof Pick<Seeded, "owner" | "hr" | "manager" |
    "employee">, method: string, path: string, body?: unknown) =>
    call(ctx.app, s[who].token, s.companyId, method, path, body);
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "acme");
  });

  it("hr creates, patches and lists", async () => {
    const c = await as("hr", "POST", "/v1/employees", { number: "H-1",
      fullName: "New Hire", jobTitle: "Driver", nationality: "PK",
      workerClass: "expat-full-time", joiningDate: "2026-03-10" });
    expect(c.status, c.text).toBe(201);
    expect(c.body.salary).toBeNull();
    const p = await as("hr", "PATCH", `/v1/employees/${c.body.id}`,
      { jobTitle: "Senior Driver" });
    expect(p.body.jobTitle).toBe("Senior Driver");
    const l = await as("hr", "GET", "/v1/employees");
    expect(l.body.items.length).toBe(5);
    const dup = await as("hr", "POST", "/v1/employees", { number: "H-1",
      fullName: "Dup", jobTitle: "X", nationality: "PK",
      workerClass: "expat-full-time", joiningDate: "2026-03-10" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("EMPLOYEE_NUMBER_TAKEN");
  });

  it("manager lists self and reports; employee only self", async () => {
    const m = await as("manager", "GET", "/v1/employees");
    expect(m.body.items.map((e: { id: string }) => e.id).sort()).toEqual(
      [s.emp.manager, s.emp.report, s.emp.report2].sort());
    const e = await as("employee", "GET", "/v1/employees");
    expect(e.body.items.map((x: { id: string }) => x.id)).toEqual(
      [s.emp.report]);
    const other = await as("employee", "GET",
      `/v1/employees/${s.emp.outsider}`);
    expect(other.status).toBe(404);
  });

  it("salary needs exactly one basic fixed component", async () => {
    const path = `/v1/employees/${s.emp.outsider}/salary`;
    const noBasic = await as("hr", "PUT", path, { components: [
      { code: "housing", label: "H", labelAr: null, amount: "1.00",
        sifBucket: "housing" }] });
    expect(noBasic.body.error.code).toBe("BASIC_COMPONENT_REQUIRED");
    const wrongBucket = await as("hr", "PUT", path, { components: [
      { code: "basic", label: "B", labelAr: null, amount: "1.00",
        sifBucket: "housing" }] });
    expect(wrongBucket.body.error.code).toBe("BASIC_COMPONENT_REQUIRED");
    const dup = salaryOf("1.00");
    dup.components[1]!.code = "basic";
    expect((await as("hr", "PUT", path, dup)).body.error.code)
      .toBe("DUPLICATE_COMPONENT");
  });

  it("amounts and IBANs stay out of audit rows and clear columns",
    async () => {
      const ok = await as("hr", "PUT",
        `/v1/employees/${s.emp.outsider}/salary`, salaryOf(SALARY_SENTINEL));
      expect(ok.status, ok.text).toBe(200);
      const rows = await withTenant(ctx.deps.db, { companyId: s.companyId,
        userId: null }, (tx) => tx.query<{ action: string; data: unknown }>(
        "SELECT action, data FROM audit_events ORDER BY seq"));
      const sal = rows.filter((r) => r.action === "employee.salary.updated");
      expect(sal.length).toBeGreaterThan(0);
      expect(sal.at(-1)?.data).toEqual({ version: 2 });
      expect(JSON.stringify(rows)).not.toContain(SALARY_SENTINEL);
      expect(JSON.stringify(rows)).not.toContain("AE0703");
      const raw = await withTenant(ctx.deps.db, { companyId: s.companyId,
        userId: null }, (tx) => tx.query(
        "SELECT salary_enc, iban_enc, labour_person_id_enc FROM employees"));
      const text = JSON.stringify(raw);
      expect(text).not.toContain("7777.77");
      expect(text).not.toContain("AE0703");
      expect(text).not.toContain("00000000000004");
    });

  it("bank reveal needs an MFA session and is audited", async () => {
    const path = `/v1/employees/${s.emp.outsider}/bank`;
    const plain = await login(ctx.app, s.owner.email, PASSWORD);
    const noMfa = await call(ctx.app, plain.body.token, s.companyId, "GET",
      path);
    expect(noMfa.status).toBe(403);
    expect(noMfa.body.error.code).toBe("MFA_REQUIRED");
    const r = await as("owner", "GET", path);
    expect(r.status, r.text).toBe(200);
    expect(r.body).toEqual({ routingCode: "803320101", iban: IBAN_SENTINEL });
    const ev = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, (tx) => tx.query<{ entity_id: string }>(
      `SELECT entity_id FROM audit_events
       WHERE action = 'employee.bank.revealed'`));
    expect(ev.map((e) => e.entity_id)).toContain(s.emp.outsider);
  });

  it("departments: create, update, list for all roles", async () => {
    const d = await as("hr", "POST", "/v1/departments", { name: "Ops",
      headEmployeeId: s.emp.manager });
    expect(d.status, d.text).toBe(201);
    const u = await as("hr", "PATCH", `/v1/departments/${d.body.id}`,
      { nameAr: "العمليات" });
    expect(u.body.nameAr).toBe("العمليات");
    const l = await as("employee", "GET", "/v1/departments");
    expect(l.body.items.map((x: { name: string }) => x.name)).toContain(
      "Ops");
    const bad = await as("hr", "POST", "/v1/departments", { name: "X",
      headEmployeeId: "00000000-0000-4000-8000-00000000dead" });
    expect(bad.status).toBe(404);
  });

  it("an invite cannot link an unknown employee", async () => {
    const r = await as("owner", "POST", "/v1/users/invite",
      { email: "x@example.com", role: "employee",
        employeeId: "00000000-0000-4000-8000-00000000dead" });
    expect(r.status).toBe(404);
  });

  it("another company's owner gets 404 for A's employee", async () => {
    const b = await signup(ctx.app, "beta");
    const r = await call(ctx.app, b.token, b.companyId, "GET",
      `/v1/employees/${s.emp.outsider}`);
    expect(r.status).toBe(404);
    const p = await call(ctx.app, b.token, b.companyId, "PATCH",
      `/v1/employees/${s.emp.outsider}`, { jobTitle: "Hacked" });
    expect(p.status).toBe(404);
  });
});
