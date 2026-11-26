/**
 * Choices on the Privacy and retention screens (WP23). They live in
 * the one demo store (demo/state.tsx), are lost on reload, and name
 * who, in which role and on which demo day. Each can be undone.
 * Nothing is deleted and nothing is sent: a choice changes only what
 * the pages show.
 */
export interface PrivacyStamp {
  who: string;
  role: string;
  /** ISO day of the demo. */
  on: string;
}

/** A change to a retention period or to the days to answer. */
export interface PrivacyEdit extends PrivacyStamp {
  id: number;
  /** "months:health" or "days". */
  key: string;
  value: number;
  what: string;
  undone: boolean;
}

export type RequestOutcome = "answered" | "legal-duty" | "declined";

export interface RequestDecision extends PrivacyStamp {
  outcome: RequestOutcome;
}

export interface PrivacySlice {
  privacyEdits: PrivacyEdit[];
  nextPrivacy: number;
  /** Request id to the decision recorded for it. */
  requestDecisions: Record<string, RequestDecision>;
  /** The retention run, signed off in the demo (nothing deleted). */
  retentionSignoff: PrivacyStamp | null;
}

export type PrivacyAction =
  | { type: "privacy-edit"; edit: Omit<PrivacyEdit, "id" | "undone"> }
  | { type: "privacy-undo"; id: number }
  | { type: "dsr-decide"; id: string; decision: RequestDecision }
  | { type: "dsr-undo"; id: string }
  | { type: "retention-sign"; stamp: PrivacyStamp }
  | { type: "retention-unsign" };

export const PRIVACY_INITIAL: PrivacySlice = { privacyEdits: [],
  nextPrivacy: 1, requestDecisions: {}, retentionSignoff: null };

export function reducePrivacy<S extends PrivacySlice>(s: S,
  a: PrivacyAction): S {
  switch (a.type) {
    case "privacy-edit":
      return { ...s, nextPrivacy: s.nextPrivacy + 1,
        privacyEdits: [{ ...a.edit, id: s.nextPrivacy, undone: false },
          ...s.privacyEdits] };
    case "privacy-undo":
      return { ...s, privacyEdits: s.privacyEdits.map((e) =>
        e.id === a.id ? { ...e, undone: true } : e) };
    case "dsr-decide":
      return { ...s, requestDecisions: { ...s.requestDecisions,
        [a.id]: a.decision } };
    case "dsr-undo": {
      const { [a.id]: _gone, ...rest } = s.requestDecisions;
      return { ...s, requestDecisions: rest };
    }
    case "retention-sign": return { ...s, retentionSignoff: a.stamp };
    case "retention-unsign": return { ...s, retentionSignoff: null };
  }
}

/** The current value for a key: the newest edit not undone, or null. */
export function privacyValue(edits: readonly PrivacyEdit[], key: string)
  : number | null {
  return edits.find((e) => e.key === key && !e.undone)?.value ?? null;
}
