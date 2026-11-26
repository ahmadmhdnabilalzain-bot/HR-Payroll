import type { Severity } from "./data/finish-types";

/**
 * WP31: what people do on the Time and safety finish screens during
 * the demo: a one-off leave grant sent to the General manager (T07) and
 * a safety incident reported by an employee (E14). One slice in the
 * demo store, like more-state.ts: every record names who made it and
 * the demo's date, and has a way back. A grant carries its own
 * approval id ("fin-ap-N") so the General manager signs it off, or
 * declines it, through the shared `decide` and `undecide` actions.
 */
export interface GrantReq {
  id: string;
  approvalId: string;
  employeeId: string;
  days: number;
  reason: string;
  makerId: string;
  checkerId: string;
  requestedOn: string;
  withdrawn: boolean;
}

export type GrantDraft = Omit<GrantReq, "id" | "approvalId" | "withdrawn">;

export interface IncidentReport {
  id: string;
  what: string;
  place: string;
  severity: Severity;
  reporterId: string;
  reportedOn: string;
  withdrawn: boolean;
}

export type IncidentDraft = Omit<IncidentReport, "id" | "withdrawn">;

export interface FinishSlice {
  grants: GrantReq[];
  incidentReports: IncidentReport[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextFinish: number;
}

export type FinishAction =
  | { type: "finish-grant"; draft: GrantDraft }
  | { type: "finish-grant-withdraw"; id: string }
  | { type: "finish-grant-restore"; id: string }
  | { type: "finish-incident"; draft: IncidentDraft }
  | { type: "finish-incident-withdraw"; id: string }
  | { type: "finish-incident-restore"; id: string };

export const FINISH_INITIAL: FinishSlice = { grants: [],
  incidentReports: [], nextFinish: 1 };

const flip = <T extends { id: string; withdrawn: boolean }>(xs: T[],
  id: string, withdrawn: boolean): T[] =>
  xs.map((x) => x.id === id ? { ...x, withdrawn } : x);

export function reduceFinish<S extends FinishSlice>(s: S, a: FinishAction)
  : S {
  const n = s.nextFinish;
  switch (a.type) {
    case "finish-grant":
      return { ...s, grants: [{ ...a.draft, id: `grant-new-${n}`,
        approvalId: `fin-ap-${n}`, withdrawn: false }, ...s.grants],
      nextFinish: n + 1 };
    case "finish-incident":
      return { ...s, incidentReports: [{ ...a.draft, id: `inc-new-${n}`,
        withdrawn: false }, ...s.incidentReports], nextFinish: n + 1 };
    case "finish-grant-withdraw":
    case "finish-grant-restore":
      return { ...s, grants: flip(s.grants, a.id,
        a.type === "finish-grant-withdraw") };
    case "finish-incident-withdraw":
    case "finish-incident-restore":
      return { ...s, incidentReports: flip(s.incidentReports, a.id,
        a.type === "finish-incident-withdraw") };
  }
}
