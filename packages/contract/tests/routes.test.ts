import { describe, expect, it } from "vitest";
import {
  DOCUMENT_ROUTES,
  FILE_BODY_LIMIT,
  ROUTES,
} from "../src/index";

const docIds = new Set(DOCUMENT_ROUTES.map((r) => r.id));
const older = ROUTES.filter((r) => !docIds.has(r.id));

function paramNames(path: string): string[] {
  return [...path.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1] ?? "");
}

describe("ROUTES", () => {
  it("has 75 routes before Plan 7 (Plan 3's 50 plus Plan 6's 25)", () => {
    expect(older.length).toBe(75);
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
    expect(ROUTES.filter((x) => x.mfa).map((x) => x.id).sort()).toEqual(
      ["approvePayRun", "changeUserRole", "downloadSifFile",
        "getEmployeeBank", "putApprovalChain", "putEmployeeBank",
        "putEmployeeSalary"]);
  });
  it("public routes are exactly the four", () => {
    const pub = ROUTES.filter((r) => r.auth === "public")
      .map((r) => `${r.method} ${r.path}`).sort();
    expect(pub).toEqual([
      "GET /v1/health",
      "POST /v1/auth/accept-invite",
      "POST /v1/auth/login",
      "POST /v1/signup",
    ]);
    const ids = ROUTES.filter((r) => r.auth === "public").map((r) => r.id);
    expect(ids.sort()).toEqual(["acceptInvite", "health", "login",
      "signup"]);
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
    const owner = older.filter((r) => r.roles.length === 1)
      .map((r) => r.id).sort();
    expect(owner).toEqual(["approvePayRun", "changeUserRole", "inviteUser",
      "listUsers", "putApprovalChain",
      "updateCompany"]);
  });
  it("only the SIF download is text/plain", () => {
    const text = ROUTES.filter((r) => r.contentType === "text/plain");
    expect(text.map((r) => r.id)).toEqual(["downloadSifFile"]);
  });
  it("binary routes are GETs; the upload has a 7.5 MB body limit", () => {
    const binary = older.filter((r) => r.contentType === "binary");
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

describe("DOCUMENT_ROUTES (Plan 7)", () => {
  it("has 35 routes, each in ROUTES exactly once", () => {
    expect(DOCUMENT_ROUTES.length).toBe(35);
    for (const d of DOCUMENT_ROUTES) {
      expect(ROUTES.filter((r) => r.id === d.id).length, d.id).toBe(1);
    }
  });
  it("binary routes are the three downloads, all GET", () => {
    const binary = DOCUMENT_ROUTES.filter((r) =>
      r.contentType === "binary");
    expect(binary.map((r) => r.id).sort()).toEqual([
      "employeeDocumentDownload", "letterDownload", "libraryDownload"]);
    for (const r of binary) expect(r.method, r.id).toBe("GET");
  });
  it("the upload has the file body limit; every route is a tenant route",
    () => {
      const up = DOCUMENT_ROUTES.find((r) => r.id === "fileUpload");
      expect(up?.bodyLimit).toBe(FILE_BODY_LIMIT);
      expect(up?.status).toBe(201);
      for (const r of DOCUMENT_ROUTES) expect(r.auth, r.id).toBe("tenant");
    });
  it("owner-only routes are settings and the native review", () => {
    const owner = DOCUMENT_ROUTES.filter((r) => r.roles.length === 1)
      .map((r) => r.id).sort();
    expect(owner).toEqual(["documentSettingsPut",
      "emiratisationSettingsPut", "letterTemplateNativeReview"]);
  });
});
