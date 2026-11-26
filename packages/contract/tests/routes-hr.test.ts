import { describe, expect, it } from "vitest";
import { CORE_ROUTES, HR_ROUTES, ROUTES } from "../src/index";

/** Plan 8's route ids, in order; each task appends its own. */
const HR_ROUTE_IDS = [
  // Task 2: task manager
  "listTasks", "createTask", "getTask", "updateTask", "addTaskComment",
  "updateChecklistItem",
];

/** Plan 8 routes that need an MFA session (Ruling 16). */
const HR_MFA: string[] = [];

describe("HR_ROUTES", () => {
  it("ids are exactly the planned list, in order", () => {
    expect(HR_ROUTES.map((r) => r.id)).toEqual(HR_ROUTE_IDS);
  });
  it("every HR route is a tenant route", () => {
    for (const r of HR_ROUTES) expect(r.auth, r.id).toBe("tenant");
  });
  it("ROUTES joins the core and HR lists", () => {
    expect(ROUTES.length).toBe(CORE_ROUTES.length + HR_ROUTES.length);
  });
  it("no (method, path) pair repeats across both lists", () => {
    const keys = ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("no route deletes anything", () => {
    expect(ROUTES.filter((r) => (r.method as string) === "DELETE"))
      .toEqual([]);
  });
  it("HR mfa routes are exactly the planned ones", () => {
    expect(HR_ROUTES.filter((r) => r.mfa).map((r) => r.id).sort())
      .toEqual([...HR_MFA].sort());
  });
});
