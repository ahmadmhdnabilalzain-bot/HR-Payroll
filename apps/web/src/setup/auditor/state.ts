import type { Stamp } from "../access/state";

/**
 * The outside auditor's access in the demo (WP22). One slice in the
 * demo store, append-only like the other slices: every entry names who
 * did it, in which role and on which demo date, and each has an undo.
 * The view log only grows: it is the record of what the auditor opened.
 */
export interface AuditorGrant {
  name: string;
  firm: string;
  email: string;
  fromIso: string;
  toIso: string;
  stamp: Stamp;
}

export interface AuditorChange {
  id: string;
  what: string;
  stamp: Stamp;
}

export interface AuditorView {
  id: string;
  /** 1-based position in the view log. */
  n: number;
  page: string;
  label: string;
  /** The auditor's name. */
  by: string;
  on: string;
}

export interface AuditorSlice {
  auditorGrant: AuditorGrant | null;
  /** Access ended by a person before its end date. */
  auditorEnded: Stamp | null;
  auditorChanges: AuditorChange[];
  auditorViews: AuditorView[];
  /** Counter for ids, made in the reducer so StrictMode stays sound. */
  nextAuditor: number;
}

export type AuditorAction =
  | { type: "auditor-grant"; grant: AuditorGrant }
  | { type: "auditor-ungrant" }
  | { type: "auditor-end-date"; toIso: string; stamp: Stamp }
  | { type: "auditor-end-date-undo"; toIso: string; id: string }
  | { type: "auditor-end"; stamp: Stamp }
  | { type: "auditor-reinstate" }
  | { type: "auditor-view"; page: string; label: string; by: string;
    on: string };

export const AUDITOR_INITIAL: AuditorSlice = { auditorGrant: null,
  auditorEnded: null, auditorChanges: [], auditorViews: [],
  nextAuditor: 1 };

const change = <S extends AuditorSlice>(s: S, what: string,
  stamp: Stamp): S => ({ ...s, nextAuditor: s.nextAuditor + 1,
  auditorChanges: [...s.auditorChanges, { id: `aud-chg-${s.nextAuditor}`,
    what, stamp }] });

export function reduceAuditor<S extends AuditorSlice>(s: S,
  a: AuditorAction): S {
  switch (a.type) {
    case "auditor-grant":
      return { ...change(s, "Access given", a.grant.stamp),
        auditorGrant: a.grant, auditorEnded: null };
    case "auditor-ungrant":
      return { ...s, auditorGrant: null, auditorEnded: null,
        auditorChanges: [] };
    case "auditor-end-date":
      return s.auditorGrant === null ? s : { ...change(s,
        "End date changed", a.stamp),
      auditorGrant: { ...s.auditorGrant, toIso: a.toIso } };
    case "auditor-end-date-undo":
      return s.auditorGrant === null ? s : { ...s,
        auditorGrant: { ...s.auditorGrant, toIso: a.toIso },
        auditorChanges: s.auditorChanges.filter((c) => c.id !== a.id) };
    case "auditor-end":
      return { ...change(s, "Access ended", a.stamp),
        auditorEnded: a.stamp };
    case "auditor-reinstate":
      return { ...s, auditorEnded: null, auditorChanges:
        s.auditorChanges.filter((c) => c.what !== "Access ended") };
    case "auditor-view":
      return { ...s, nextAuditor: s.nextAuditor + 1,
        auditorViews: [...s.auditorViews, { id: `aud-view-${
          s.nextAuditor}`, n: s.auditorViews.length + 1, page: a.page,
        label: a.label, by: a.by, on: a.on }] };
  }
}
