import type { AuditorGrant } from "./state";

/**
 * The auditor as a row in the Users and Access review lists. The
 * auditor is an outside person, not an employee, so there is no record
 * to open; the row links to Auditor access instead.
 */
export interface ExternalUser {
  id: string;
  employeeId: string;
  name: string;
  jobText: string;
  email: string;
  rolesText: string;
  mfaText: "On";
  lastSignInText: string;
  createdText: string;
}

export const EXTERNAL_ID = "usr-ext-001";

export function externalUsers(g: AuditorGrant | null, ended: boolean,
  viewedLast: string | null, dateText: (iso: string) => string)
  : ExternalUser[] {
  if (g === null || ended) return [];
  return [{ id: EXTERNAL_ID, employeeId: "", name: g.name,
    jobText: g.firm, email: g.email,
    rolesText: `Auditor, read only (ends ${dateText(g.toIso)})`,
    mfaText: "On", lastSignInText: viewedLast ?? "Not yet",
    createdText: dateText(g.fromIso) }];
}
