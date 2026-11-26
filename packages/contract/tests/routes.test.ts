import { describe, expect, it } from "vitest";
import { ROUTES } from "../src/index";

function paramNames(path: string): string[] {
  return [...path.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1] ?? "");
}

describe("ROUTES", () => {
  it("has 49 routes", () => {
    expect(ROUTES.length).toBe(49);
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
      ["approvePayRun", "downloadSifFile", "getEmployeeBank"]);
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
    const owner = ROUTES.filter((r) => r.roles.length === 1)
      .map((r) => r.id).sort();
    expect(owner).toEqual(["approvePayRun", "inviteUser", "listUsers",
      "updateCompany"]);
  });
  it("only the SIF download is text/plain", () => {
    const text = ROUTES.filter((r) => r.contentType === "text/plain");
    expect(text.map((r) => r.id)).toEqual(["downloadSifFile"]);
  });
});
