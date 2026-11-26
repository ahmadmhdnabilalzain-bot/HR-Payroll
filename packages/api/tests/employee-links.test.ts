import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

describe("employee links, managers and clearing fields", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  const as = (method: string, path: string, body?: unknown) =>
    call(ctx.app, s.owner.token, s.companyId, method, path, body);
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "links");
  });

  it("one user account per employee record", async () => {
    const linked = await as("POST", "/v1/users/invite", { email:
      "twin@example.com", role: "employee", employeeId: s.emp.report });
    expect(linked.status).toBe(409);
    expect(linked.body.error.code).toBe("EMPLOYEE_ALREADY_LINKED");
    const first = await as("POST", "/v1/users/invite", { email:
      "o1@example.com", role: "employee", employeeId: s.emp.outsider });
    expect(first.status, first.text).toBe(201);
    const second = await as("POST", "/v1/users/invite", { email:
      "o2@example.com", role: "employee", employeeId: s.emp.outsider });
    expect(second.body.error.code).toBe("EMPLOYEE_ALREADY_LINKED");
  });

  it("refuses a manager cycle", async () => {
    const r = await as("PATCH", `/v1/employees/${s.emp.manager}`,
      { managerId: s.emp.report });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("MANAGER_CYCLE");
    const deep = await as("PATCH", `/v1/employees/${s.emp.report2}`,
      { managerId: s.emp.report });
    expect(deep.status, deep.text).toBe(200);
    const loop = await as("PATCH", `/v1/employees/${s.emp.manager}`,
      { managerId: s.emp.report2 });
    expect(loop.body.error.code).toBe("MANAGER_CYCLE");
  });

  it("PATCH with null clears optional fields", async () => {
    await as("PATCH", `/v1/employees/${s.emp.report2}`,
      { lastWorkingDate: "2026-12-31", email: "x@example.com" });
    const r = await as("PATCH", `/v1/employees/${s.emp.report2}`,
      { lastWorkingDate: null, email: null, managerId: null,
        labourPersonId: null });
    expect(r.status, r.text).toBe(200);
    expect(r.body).toMatchObject({ lastWorkingDate: null, email: null,
      managerId: null, labourPersonId: null });
    const bad = await as("PATCH", `/v1/employees/${s.emp.report2}`,
      { fullName: null });
    expect(bad.status).toBe(400);
  });
});
