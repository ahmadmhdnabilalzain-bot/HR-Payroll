import { describe, expect, it } from "vitest";
import { CHANNEL_ROUTES, ROUTES } from "../src/index";
import { PLAN3_IDS, PLAN6_IDS, PUBLIC_CHANNEL_IDS } from "./route-ids";

function paramNames(path: string): string[] {
  return [...path.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1] ?? "");
}

describe("ROUTES", () => {
  it("the Plan 3 and Plan 6 ids are all present", () => {
    const ids = ROUTES.map((r) => r.id);
    for (const id of PLAN3_IDS) expect(ids, id).toContain(id);
    for (const id of PLAN6_IDS) expect(ids, id).toContain(id);
    expect(PLAN3_IDS.length + PLAN6_IDS.length).toBe(75);
  });
  it("ids are unique", () => {
    const ids = ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("(method, path) pairs are unique", () => {
    const keys = ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("every path starts with /v1/", () => {
    for (const r of ROUTES) expect(r.path, r.id).toMatch(/^\/v1\//);
  });
  it("every {param} has a params schema key", () => {
    for (const r of ROUTES) {
      for (const p of paramNames(r.path)) {
        expect(r.params?.shape, r.id).toHaveProperty(p);
      }
    }
  });
  it("mfa routes are tenant routes", () => {
    for (const r of ROUTES.filter((x) => x.mfa)) {
      expect(r.auth, r.id).toBe("tenant");
    }
    const mfa = ROUTES.filter((x) => x.mfa).map((x) => x.id);
    for (const id of ["approvePayRun", "changeUserRole", "downloadSifFile",
      "getEmployeeBank", "putApprovalChain", "putEmployeeBank",
      "putEmployeeSalary"]) expect(mfa, id).toContain(id);
    const other = mfa.filter((id) => !PLAN3_IDS.includes(id) &&
      !PLAN6_IDS.includes(id));
    for (const id of other) {
      expect(CHANNEL_ROUTES.map((r) => r.id), id).toContain(id);
    }
  });
  it("public routes are the four plus the listed channel ids", () => {
    const ids = ROUTES.filter((r) => r.auth === "public").map((r) => r.id);
    expect(ids.sort()).toEqual(["acceptInvite", "health", "login",
      "signup", ...PUBLIC_CHANNEL_IDS].sort());
    const pub = ROUTES.filter((r) => r.auth === "public" &&
      !PUBLIC_CHANNEL_IDS.includes(r.id))
      .map((r) => `${r.method} ${r.path}`).sort();
    expect(pub).toEqual([
      "GET /v1/health",
      "POST /v1/auth/accept-invite",
      "POST /v1/auth/login",
      "POST /v1/signup",
    ]);
  });
  it("POST /v1/pay-runs declares Idempotency-Key", () => {
    const r = ROUTES.find((x) => x.method === "POST" &&
      x.path === "/v1/pay-runs");
    expect(r?.headers?.shape).toHaveProperty("idempotency-key");
    const h = r!.headers!;
    expect(h.safeParse({ "idempotency-key": "k" }).success).toBe(true);
    expect(h.safeParse({ "idempotency-key": "x".repeat(101) }).success)
      .toBe(false);
  });
  it("tenant routes carry roles; user and public routes carry none", () => {
    for (const r of ROUTES) {
      if (r.auth === "tenant") expect(r.roles.length, r.id).toBeGreaterThan(0);
      else expect(r.roles, r.id).toEqual([]);
    }
  });
  it("owner-only routes are the four", () => {
    const owner = ROUTES.filter((r) => r.roles.length === 1 &&
      !CHANNEL_ROUTES.includes(r)).map((r) => r.id).sort();
    expect(owner).toEqual(["approvePayRun", "changeUserRole", "inviteUser",
      "listUsers", "putApprovalChain",
      "updateCompany"]);
  });
  it("only the SIF download is text/plain", () => {
    const text = ROUTES.filter((r) => r.contentType === "text/plain" &&
      !CHANNEL_ROUTES.includes(r));
    expect(text.map((r) => r.id)).toEqual(["downloadSifFile"]);
  });
  it("binary routes are GETs; the upload has a 7.5 MB body limit", () => {
    const binary = ROUTES.filter((r) => r.contentType === "binary" &&
      !CHANNEL_ROUTES.includes(r));
    expect(binary.map((r) => r.id)).toEqual(["downloadReceipt"]);
    for (const r of binary) expect(r.method, r.id).toBe("GET");
    const up = ROUTES.find((r) => r.id === "uploadReceipt");
    expect(up?.bodyLimit).toBe(7_500_000);
    expect(up?.status).toBe(201);
  });
  it("changing an approval chain is owner-only with MFA", () => {
    const r = ROUTES.find((x) => x.id === "putApprovalChain");
    expect(r?.mfa).toBe(true);
    expect(r?.roles).toEqual(["owner"]);
  });
  it("the five expense reports are owner and hr only", () => {
    const ids = ["expenseSummary", "expenseVatRegister", "expenseAging",
      "expenseUnpaid", "expensePayouts"];
    for (const id of ids) {
      expect(ROUTES.find((r) => r.id === id)?.roles, id)
        .toEqual(["owner", "hr"]);
    }
    const csv = ROUTES.filter((r) => r.contentType === "text/csv-optional")
      .map((r) => r.id).sort();
    expect(csv).toEqual(["expensePayouts", "expenseSummary",
      "expenseVatRegister"]);
  });
});
