import { EmployeeList, EmployeeView } from "@payroll/contract";
import { beforeEach, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import {
  march,
  postRun,
  salaryOf,
  seedCompany,
  type Seeded,
} from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("employee field crypto", () => {
  let ctx: Ctx;
  let s: Seeded;
  const sql = (q: string, p: unknown[] = []) => withTenant(ctx.deps.db,
    { companyId: s.companyId, userId: null }, (tx) => tx.query<{
      salary_enc: string; iban_enc: string }>(q, p));
  const get = (who: "owner" | "employee", path: string) =>
    call(ctx.app, s[who].token, s.companyId, "GET", path);
  beforeEach(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "crypt");
  });

  it("an older salary cipher written back is refused, not served",
    async () => {
      const [old] = await sql(
        "SELECT salary_enc FROM employees WHERE id = $1", [s.emp.outsider]);
      const put = await call(ctx.app, s.owner.token, s.companyId, "PUT",
        `/v1/employees/${s.emp.outsider}/salary`, salaryOf("5000.00"));
      expect(put.status, put.text).toBe(200);
      await sql("UPDATE employees SET salary_enc = $2 WHERE id = $1",
        [s.emp.outsider, old!.salary_enc]);
      const r = await get("owner", `/v1/employees/${s.emp.outsider}`);
      expect(r.status).toBe(200);
      const v = EmployeeView.parse(r.body);
      expect(v.salary).toBeNull();
      expect(v.unreadable).toEqual(["salary"]);
      expect(r.text).not.toContain("7777.77");
    });

  it("one bad row leaves every list working", async () => {
    const [other] = await sql(
      "SELECT salary_enc FROM employees WHERE id = $1", [s.emp.outsider]);
    await sql("UPDATE employees SET salary_enc = $2 WHERE id = $1",
      [s.emp.report2, other!.salary_enc]);
    const owner = await get("owner", "/v1/employees");
    expect(owner.status).toBe(200);
    const bad = EmployeeList.parse(owner.body).items
      .find((e) => e.id === s.emp.report2)!;
    expect(bad.unreadable).toEqual(["salary"]);
    const self = await get("employee", "/v1/employees");
    expect(self.status).toBe(200);
    expect(self.body.items[0].unreadable).toBeUndefined();
    const logs = JSON.stringify(ctx.logs);
    expect(logs).toContain("decrypt.failed");
    expect(logs).not.toContain("7777.77");
  });

  it("an unreadable employee stops a pay run with a problem", async () => {
    const [other] = await sql(
      "SELECT iban_enc FROM employees WHERE id = $1", [s.emp.outsider]);
    await sql("UPDATE employees SET iban_enc = $2 WHERE id = $1",
      [s.emp.report2, other!.iban_enc]);
    const r = await postRun(ctx, s.hr, s, "bad-1", march);
    expect(r.status).toBe(422);
    expect(r.body.error.detail.problems).toEqual([{
      employeeId: s.emp.report2, code: "EMPLOYEE_DATA_UNREADABLE",
      missing: ["bank"] }]);
  });

  it("the masked bank comes from the sealed value", async () => {
    const r = await get("employee", `/v1/employees/${s.emp.report}`);
    expect(r.body.bank).toEqual({ routingCode: "803320101",
      ibanLast4: "0022" });
    const cols = await sql(`SELECT column_name FROM information_schema
      .columns WHERE table_name = 'employees'
      AND column_name IN ('bank_routing', 'iban_last4')`);
    expect(cols).toEqual([]);
  });
});
