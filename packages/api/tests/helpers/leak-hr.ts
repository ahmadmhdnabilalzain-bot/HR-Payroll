import {
  CANDIDATE_EMAIL_SENTINEL,
  EXIT_REASON_SENTINEL,
  OFFER_SENTINEL,
  type HrSeeded,
} from "./seed-hr";

type Role = "owner" | "hr" | "manager" | "employee";

/** `{id}` kinds of Plan 8's GET routes (null: no id in the path). */
export const HR_ID_KIND: Record<string, string | null> = {
  listTasks: null,
  getTask: "task",
  listRequisitions: null,
  getRequisition: "requisition",
  listCandidates: null,
  listApplications: null,
  getApplication: "application",
  listOffers: null,
  getOffer: "offer",
  listChecklistTemplates: null,
  getEmploymentTerms: "employee",
  listExits: null,
  getExit: "exit",
  listGoals: null,
  getGoal: "goal",
};

const FIXTURE: Record<string, keyof HrSeeded> = {
  task: "taskId",
  requisition: "requisitionId",
  application: "applicationId",
  offer: "offerId",
  exit: "exitId",
  goal: "goalId",
};

export const HR_KINDS = Object.keys(FIXTURE);

/** The fixture id for an HR kind. */
export function hrIdFor(kind: string, h: HrSeeded): string {
  const key = FIXTURE[kind];
  if (key === undefined) throw new Error(`no HR fixture for ${kind}`);
  return h[key] as string;
}

/** Who may open each HR fixture (others get 404). */
export function hrVisible(role: Role, kind: string): boolean {
  if (role === "owner" || role === "hr") return true;
  // The seeded task is hr's, assigned to the employee user.
  if (kind === "task") return role === "employee";
  // The seeded requisition's hiring manager is the manager user.
  // The seeded exit is of report2, the manager's direct report.
  // The seeded goal is report2's too.
  const managers = ["requisition", "application", "offer", "exit", "goal"];
  if (managers.includes(kind)) {
    return role === "manager";
  }
  return false;
}

/** GET paths whose owner body must carry the given sentinel. */
export function hrOwnerPaths(h: HrSeeded): [string, string][] {
  return [["/v1/candidates", CANDIDATE_EMAIL_SENTINEL],
    [`/v1/offers/${h.offerId}`, OFFER_SENTINEL],
    ["/v1/offers", OFFER_SENTINEL],
    [`/v1/exits/${h.exitId}`, EXIT_REASON_SENTINEL],
    ...Object.values(h.settlementSentinels).map((t): [string, string] =>
      [`/v1/exits/${h.exitId}`, t]),
    ...Object.values(h.settlementSentinels).map((t): [string, string] =>
      ["/v1/exits", t])];
}

/** Values only owner and hr may receive. */
export function hrSentinels(h: HrSeeded): string[] {
  return [CANDIDATE_EMAIL_SENTINEL, OFFER_SENTINEL, EXIT_REASON_SENTINEL,
    ...Object.values(h.settlementSentinels)];
}
