import { describe, expect, it } from "vitest";
import { API_KEY_SCOPES, ApiScope, CHANNEL_ROUTES, ROUTES } from "../src/index";
import { PLAN6_IDS } from "./route-ids";

describe("API_KEY_SCOPES (default deny)", () => {
  const ids = Object.keys(API_KEY_SCOPES);
  it("names tenant, non-MFA, non-channel routes only", () => {
    for (const id of ids) {
      const r = ROUTES.find((x) => x.id === id);
      expect(r, id).toBeDefined();
      expect(r!.mfa, id).toBe(false);
      expect(r!.auth, id).toBe("tenant");
      expect(CHANNEL_ROUTES.includes(r!), id).toBe(false);
    }
  });
  it("never opens salary, bank, pay-run actions, SIF, audit or spine", () => {
    const spine = PLAN6_IDS.filter((x) => !["listExpenseClaims",
      "getExpenseClaim"].includes(x));
    for (const id of ["putEmployeeSalary", "putEmployeeBank",
      "getEmployeeBank", "createPayRun", "approvePayRun", "generateSif",
      "downloadSifFile", "approveLeaveRequest", "rejectLeaveRequest",
      "listAuditEvents", ...spine]) expect(ids, id).not.toContain(id);
  });
  it("uses every scope", () => {
    const used = new Set(Object.values(API_KEY_SCOPES));
    for (const s of ApiScope.options) expect(used.has(s), s).toBe(true);
  });
});
