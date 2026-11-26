import {
  ApiErrorBody,
  ERROR_CODES,
  ROUTES,
  routeById,
} from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { base32Decode, totpCode } from "../src/auth/totp";
import { hrFlow } from "./helpers/conformance-hr";
import { salaryOf } from "./helpers/seed";
import { call, makeApp, PASSWORD, type Res } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
interface Hit { id: string; res: Res }

/** Calls one route by id and records the response. */
function recorder(ctx: Ctx, hits: Hit[]) {
  return async (id: string, token: string | null, company: string | null,
    params: Record<string, string> = {}, body?: unknown,
    extra: { query?: string; headers?: Record<string, string> } = {}) => {
    const def = routeById(id);
    let path = def.path;
    for (const [k, v] of Object.entries(params)) {
      path = path.replace(`{${k}}`, v);
    }
    const res = await call(ctx.app, token, company, def.method,
      path + (extra.query ?? ""), body, extra.headers);
    hits.push({ id, res });
    return res;
  };
}

describe("whole-API conformance", () => {
  let ctx: Ctx;
  const hits: Hit[] = [];

  beforeAll(async () => {
    ctx = await makeApp();
    await runFlow(ctx, recorder(ctx, hits));
  });

  it("registers every ROUTES id exactly once and nothing else", () => {
    const routes = (ctx.app.routes as { method: string; path: string }[])
      .filter((r) => r.method !== "ALL")
      .map((r) => `${r.method} ${r.path}`);
    const want = ROUTES.map((r) =>
      `${r.method} ${r.path.replace(/\{([a-zA-Z]+)\}/g, ":$1")}`);
    expect([...routes].sort()).toEqual([...want].sort());
  });

  it("one happy-path call per route parses with its response schema",
    () => {
      for (const r of ROUTES) {
        const ok = hits.find((h) => h.id === r.id && h.res.status < 300);
        expect(ok, `${r.id} never succeeded`).toBeDefined();
        const body = r.status === 204 ? null : ok!.res.body;
        const parsed = r.response.safeParse(body);
        expect(parsed.success, `${r.id}: ${parsed.error?.message}`)
          .toBe(true);
      }
    });

  it("every error body parses and carries a known code", () => {
    const errors = hits.filter((h) => h.res.status >= 400);
    expect(errors.length).toBeGreaterThan(2);
    for (const h of errors) {
      const b = ApiErrorBody.parse(h.res.body);
      expect(ERROR_CODES).toContain(b.error.code);
    }
  });
});

type Hitter = ReturnType<typeof recorder>;

async function mfaToken(ctx: Ctx, hit: Hitter, token: string,
  email: string): Promise<string> {
  const e = await hit("enrolMfa", token, null, {}, { password: PASSWORD });
  const secret = base32Decode(e.body.secret);
  const code = () => totpCode(secret, Math.floor(ctx.clock.now.getTime()
    / 1000));
  await hit("confirmMfa", token, null, {}, { code: code(), password:
    PASSWORD });
  ctx.clock.advance(30_000);
  const l = await hit("login", null, null, {}, { email, password: PASSWORD,
    totp: code() });
  return l.body.token;
}

async function join(hit: Hitter, owner: string, c: string, email: string,
  role: string, employeeId?: string) {
  const body: Record<string, string> = { email, role };
  if (employeeId !== undefined) body.employeeId = employeeId;
  const inv = await hit("inviteUser", owner, c, {}, body);
  return hit("acceptInvite", null, null, {}, { setupToken:
    inv.body.setupToken, password: PASSWORD, displayName: role });
}

async function runFlow(ctx: Ctx, hit: Hitter): Promise<void> {
  await hit("health", null, null);
  const su = await hit("signup", null, null, {}, { companyName: "Conf LLC",
    email: "conf@example.com", password: PASSWORD, displayName: "Owner" });
  const c = su.body.memberships[0].companyId as string;
  await hit("getMe", su.body.token, null);
  await hit("getCompany", su.body.token, null);
  const owner = await mfaToken(ctx, hit, su.body.token, "conf@example.com");
  await hit("getCompany", owner, c);
  await hit("updateCompany", owner, c, {}, { wps: {
    employerId: "0000000123456", bankRoutingCode: "802420101" } });
  const emp = await people(hit, owner, c);
  const o2 = await join(hit, owner, c, "o2@example.com", "owner");
  const owner2 = await mfaToken(ctx, hit, o2.body.token, "o2@example.com");
  const e = await join(hit, owner, c, "e@example.com", "employee", emp);
  const x = await join(hit, owner, c, "x@example.com", "hr");
  await hit("listUsers", owner, c);
  await hit("changeUserRole", owner, c, { id: x.body.user.id },
    { role: "manager" });
  await leave(hit, owner, e.body.token, c, emp);
  await attendance(hit, owner, e.body.token, c);
  await payroll(hit, owner, owner2, e.body.token, c);
  await hrFlow(hit, { owner, ownerId: su.body.user.id, owner2,
    emp: e.body.token,
    empUserId: e.body.user.id, employeeId: emp, c });
  await hit("listAuditEvents", owner, c, {}, undefined,
    { query: "?limit=10" });
  await hit("verifyAuditChain", owner, c);
  await hit("logout", owner, null);
  await hit("getMe", owner, null);
}

async function people(hit: Hitter, t: string, c: string) {
  const d = await hit("createDepartment", t, c, {}, { name: "Ops" });
  await hit("updateDepartment", t, c, { id: d.body.id }, { nameAr: null });
  await hit("listDepartments", t, c);
  const e = await hit("createEmployee", t, c, {}, { number: "E-1",
    fullName: "Emp One", jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate: "2019-01-01",
    labourPersonId: "00000000000001", departmentId: d.body.id });
  const id = e.body.id as string;
  await hit("updateEmployee", t, c, { id }, { jobTitle: "Senior Clerk" });
  await hit("putEmployeeSalary", t, c, { id }, salaryOf("4000.00"));
  await hit("putEmployeeBank", t, c, { id }, { routingCode: "803320101",
    iban: "AE070331234567890123456" });
  await hit("getEmployeeBank", t, c, { id });
  await hit("listEmployees", t, c);
  await hit("getEmployee", t, c, { id });
  await hit("putEmployeeSalary", t, c, { id }, { components: [] });
  return id;
}

async function leave(hit: Hitter, owner: string, emp: string, c: string,
  id: string) {
  const lt = await hit("createLeaveType", owner, c, {}, { name: "Annual",
    paid: true, annualDays: 30 });
  await hit("updateLeaveType", owner, c, { id: lt.body.id },
    { nameAr: null });
  await hit("listLeaveTypes", emp, c);
  await hit("createLeaveAdjustment", owner, c, {}, { employeeId: id,
    leaveTypeId: lt.body.id, year: 2026, days: 1, reason: "carry" });
  const req = (start: string) => hit("createLeaveRequest", emp, c, {},
    { leaveTypeId: lt.body.id, startDate: start, endDate: start });
  const a = await req("2026-05-04");
  await hit("approveLeaveRequest", owner, c, { id: a.body.id }, {});
  const b = await req("2026-05-05");
  await hit("rejectLeaveRequest", owner, c, { id: b.body.id }, {});
  const d = await req("2026-05-06");
  await hit("cancelLeaveRequest", emp, c, { id: d.body.id });
  await hit("listLeaveRequests", emp, c);
  await hit("getLeaveBalances", emp, c, { id }, undefined,
    { query: "?year=2026" });
}

async function attendance(hit: Hitter, owner: string, emp: string,
  c: string) {
  const i = await hit("clockIn", emp, c);
  await hit("clockOut", emp, c);
  await hit("listAttendance", emp, c, {}, undefined,
    { query: "?from=2026-01-01&to=2026-12-31" });
  await hit("correctAttendance", owner, c, { id: i.body.id }, {
    clockIn: "2026-03-01T05:00:00.000Z",
    clockOut: "2026-03-01T13:00:00.000Z", note: "fixed" });
}

async function payroll(hit: Hitter, owner: string, owner2: string,
  emp: string, c: string) {
  const post = (key: string, month: number) => hit("createPayRun", owner, c,
    {}, { period: { year: 2026, month }, entries: [] },
    { headers: { "idempotency-key": key } });
  const april = await post("apr", 4);
  await hit("voidPayRun", owner, c, { id: april.body.id });
  const run = await post("mar", 3);
  const id = run.body.id as string;
  await hit("listPayRuns", owner, c);
  await hit("getPayRun", owner, c, { id });
  await hit("listPayRunPayslips", owner, c, { id });
  await hit("approvePayRun", owner2, c, { id });
  const mine = await hit("listMyPayslips", emp, c);
  await hit("getPayslip", emp, c, { id: mine.body.items[0].id });
  const sif = await hit("generateSif", owner, c, { id });
  await hit("getSifFile", owner, c, { id: sif.body.id });
  await hit("downloadSifFile", owner, c, { id: sif.body.id });
}
