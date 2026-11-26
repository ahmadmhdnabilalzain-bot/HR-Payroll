import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../../src/api/contract";
import { createHttpApi } from "../../src/api/http/http-client";
import { codeOf } from "../helpers/mock";

type Call = { url: string; init: RequestInit };

function stub(status: number, body: unknown, type = "application/json") {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(status === 204 ? null : text,
      { status, headers: { "content-type": type } });
  }) as unknown as typeof fetch;
  const auth = { token: () => "t1", companyId: () => "c1" };
  return { api: createHttpApi("https://api.test", auth, fetchFn), calls };
}

const header = (c: Call | undefined, name: string): string | null =>
  new Headers(c?.init.headers).get(name);

describe("http client", () => {
  it("sends-auth-headers", async () => {
    const t = stub(200, EXAMPLES["EmployeeList"]);
    await t.api.listEmployees();
    expect(t.calls[0]?.url).toBe("https://api.test/v1/employees");
    expect(header(t.calls[0], "authorization")).toBe("Bearer t1");
    expect(header(t.calls[0], "x-company-id")).toBe("c1");
    const l = stub(200, EXAMPLES["LoginResponse"]);
    await l.api.login({ email: "a@demo.test", password: "x" });
    expect(header(l.calls[0], "authorization")).toBeNull();
    expect(header(l.calls[0], "x-company-id")).toBeNull();
  });

  it("money-to-fils", async () => {
    const view = EXAMPLES["EmployeeView"] as Record<string, unknown>;
    const body = { ...view, salary: [{ code: "basic", label: "Basic",
      labelAr: null, amount: "1234.00", sifBucket: "fixed" }] };
    const t = stub(200, body);
    const e = await t.api.getEmployee(String(view["id"]));
    expect(e.salary?.[0]?.amount).toBe(fils(123400n));
    expect(t.calls[0]?.url).toContain(`/v1/employees/${String(view["id"])}`);
  });

  it("error-envelope", async () => {
    const t = stub(409, { error: { code: "RUN_NOT_DRAFT",
      message: "Run is not a draft", requestId: "r1" } });
    const e = await t.api.voidPayRun("x").catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "RUN_NOT_DRAFT", status: 409,
      requestId: "r1" });
  });

  it("network-failure", async () => {
    const fetchFn = (async () => {
      throw new TypeError("failed");
    }) as unknown as typeof fetch;
    const api = createHttpApi("", { token: () => null,
      companyId: () => null }, fetchFn);
    expect(await codeOf(api.listEmployees())).toBe("NETWORK");
  });

  it("schema-mismatch-loud", async () => {
    const view = { ...(EXAMPLES["EmployeeView"] as object) };
    delete (view as Record<string, unknown>)["number"];
    const t = stub(200, { items: [view] });
    const e = await t.api.listEmployees().catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "CONTRACT_MISMATCH" });
    expect(JSON.stringify((e as { detail: unknown }).detail))
      .toContain("items.0.number");
  });

  it("idempotency-header", async () => {
    const t = stub(201, EXAMPLES["PayRun"]);
    await t.api.createPayRun({ period: { year: 2026, month: 3 },
      entries: [] }, "idem-1");
    expect(header(t.calls[0], "idempotency-key")).toBe("idem-1");
    expect(t.calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(t.calls[0]?.init.body)))
      .toEqual({ period: { year: 2026, month: 3 }, entries: [] });
  });

  it("download-text", async () => {
    const t = stub(200, "EDR,1\r\nSCR,2\r\n", "text/plain");
    expect(await t.api.downloadSif("f")).toBe("EDR,1\r\nSCR,2\r\n");
  });

  it("query-string", async () => {
    const t = stub(200, { items: [] });
    await t.api.listAttendance({ from: "2026-11-01", to: "2026-11-30" });
    expect(t.calls[0]?.url)
      .toBe("https://api.test/v1/attendance?from=2026-11-01&to=2026-11-30");
  });

  it("problems-decoded", async () => {
    const problem = { employeeId: "e1", code: "ENTERED_AMOUNTS_REQUIRED",
      missing: ["basic"] };
    const t = stub(422, { error: { code: "PAY_RUN_PROBLEMS",
      message: "Problems", requestId: "r2",
      detail: { problems: [JSON.stringify(problem)] } } });
    const e = await t.api.createPayRun({ period: { year: 2026, month: 3 },
      entries: [] }, "k").catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "PAY_RUN_PROBLEMS",
      problems: [problem] });
  });
});
