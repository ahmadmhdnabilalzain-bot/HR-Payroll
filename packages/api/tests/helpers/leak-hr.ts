import type { HrSeeded } from "./seed-hr";

type Role = "owner" | "hr" | "manager" | "employee";

/** `{id}` kinds of Plan 8's GET routes (null: no id in the path). */
export const HR_ID_KIND: Record<string, string | null> = {
  listTasks: null,
  getTask: "task",
};

/** The fixture id for an HR kind. */
export function hrIdFor(kind: string, h: HrSeeded): string {
  if (kind === "task") return h.taskId;
  throw new Error(`no HR fixture for ${kind}`);
}

export const HR_KINDS = ["task"];

/** Who may open each HR fixture (others get 404). */
export function hrVisible(role: Role, kind: string): boolean {
  if (role === "owner" || role === "hr") return true;
  // The seeded task is hr's, assigned to the employee user.
  if (kind === "task") return role === "employee";
  return false;
}

/** Values only owner and hr may receive; later tasks add sentinels. */
export function hrSentinels(_h: HrSeeded): string[] {
  return [];
}
