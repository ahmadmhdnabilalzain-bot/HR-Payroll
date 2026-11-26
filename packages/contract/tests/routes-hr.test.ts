import { describe, expect, it } from "vitest";
import {
  CORE_ROUTES,
  DOCUMENT_ROUTES,
  HR_ROUTES,
  ROUTES,
  TIME_ROUTES,
} from "../src/index";

/** Plan 8's route ids, in order; each task appends its own. */
const HR_ROUTE_IDS = [
  // Task 2: task manager
  "listTasks", "createTask", "getTask", "updateTask", "addTaskComment",
  "updateChecklistItem",
  // Task 3: requisitions and the applicant tracker
  "listRequisitions", "createRequisition", "getRequisition",
  "decideRequisition", "closeRequisition", "listCandidates",
  "createCandidate", "listApplications", "createApplication",
  "getApplication", "moveApplicationStage", "submitScorecard",
  "scheduleInterview", "cancelInterview",
  // Task 4: offers
  "createOffer", "listOffers", "getOffer", "decideOffer",
  "recordOfferResponse", "withdrawOffer",
  // Task 5: offer to hire, templates, employment terms
  "hireFromOffer", "listChecklistTemplates", "putChecklistTemplate",
  "getEmploymentTerms", "putEmploymentTerms",
  // Task 6: exits and the final settlement
  "createExit", "listExits", "getExit", "decideExit",
  "computeExitSettlement", "withdrawExit",
  // Task 7: exit hooks and closing
  "generateExitDocuments", "revokeExitAccess", "closeExit",
  "linkUserEmployee",
  // Task 8: goals
  "listGoals", "createGoal", "getGoal", "updateGoal", "addGoalCheckIn",
];

/** Plan 8 routes that need an MFA session (Ruling 16). */
const HR_MFA: string[] = ["decideOffer", "revokeExitAccess",
  "linkUserEmployee"];

describe("HR_ROUTES", () => {
  it("ids are exactly the planned list, in order", () => {
    expect(HR_ROUTES.map((r) => r.id)).toEqual(HR_ROUTE_IDS);
  });
  it("final counts: 46 HR routes, 121 in all (core 75)", () => {
    expect(HR_ROUTES.length).toBe(46);
    // Plan 7's DOCUMENT_ROUTES and Plan 9's TIME_ROUTES join
    // ROUTES too; each plan counts its own.
    expect(ROUTES.filter((r) => !TIME_ROUTES.includes(r) &&
      !DOCUMENT_ROUTES.includes(r)).length).toBe(121);
  });
  it("every HR route is a tenant route", () => {
    for (const r of HR_ROUTES) expect(r.auth, r.id).toBe("tenant");
  });
  it("ROUTES joins the core, HR, document and time lists", () => {
    expect(ROUTES.length).toBe(CORE_ROUTES.length + HR_ROUTES.length +
      DOCUMENT_ROUTES.length + TIME_ROUTES.length);
    for (const r of [...CORE_ROUTES, ...HR_ROUTES, ...DOCUMENT_ROUTES,
      ...TIME_ROUTES]) {
      expect(ROUTES, r.id).toContain(r);
    }
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
