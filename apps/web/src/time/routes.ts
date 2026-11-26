import type { Role } from "../demo/state";

/**
 * Who may open each Time page: `#/time-off/<slug>`. The registry and
 * the router read this one list, so a deep link after a role switch
 * is turned away the same way the panel hides the area.
 */
export const HR_GM: readonly Role[] = ["hr", "gm"];
export const TEAM: readonly Role[] = ["hr", "gm", "manager"];

export const SLUG_ROLES: Record<string, readonly Role[]> = {
  attendance: TEAM, register: TEAM, against: TEAM, punches: HR_GM,
  overtime: TEAM, roster: TEAM, plan: HR_GM, balances: TEAM,
};
