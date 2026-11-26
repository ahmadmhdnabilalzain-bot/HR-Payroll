import type { Fils } from "@payroll/engine";

/**
 * WP18: what people do on the extra People, Time and Me screens during
 * the demo: a new employee sent for sign-off (P04), an expense claim
 * (E08), a time card correction (E09) and approval cover (H10). One
 * slice in the demo store, like papers-state.ts: every record names
 * who made it, the demo's date, who decides, and has a way back. Each
 * request carries its own approval id ("more-ap-N"), so a decision
 * goes through the shared `decide` and `undecide` actions.
 */
export interface NewHire {
  id: string;
  approvalId: string;
  /** The accepted offer this record comes from, or null when typed. */
  offerId: string | null;
  name: string;
  nationality: string;
  departmentId: string;
  jobKey: string;
  grade: number;
  location: string;
  basic: Fils;
  startOn: string;
  probationMonths: number;
  number: string;
  makerId: string;
  checkerId: string;
  requestedOn: string;
  withdrawn: boolean;
}

export type NewHireDraft = Omit<NewHire, "id" | "approvalId" | "withdrawn">;

export interface Claim {
  id: string;
  approvalId: string;
  employeeId: string;
  kind: string;
  date: string;
  amount: Fils;
  note: string;
  checkerId: string;
  requestedOn: string;
  withdrawn: boolean;
}

export type ClaimDraft = Omit<Claim, "id" | "approvalId" | "withdrawn">;

export type FixPart = "in" | "out" | "both" | "absent";

export interface TimeFix {
  id: string;
  approvalId: string;
  employeeId: string;
  date: string;
  part: FixPart;
  clockIn: string;
  clockOut: string;
  reason: string;
  checkerId: string;
  requestedOn: string;
  withdrawn: boolean;
}

export type TimeFixDraft = Omit<TimeFix, "id" | "approvalId" | "withdrawn">;

export interface CoverReq {
  id: string;
  approvalId: string;
  /** The person who is away, and the colleague who decides for them. */
  approverId: string;
  coverId: string;
  /** ISO dates. */
  from: string;
  to: string;
  makerId: string;
  checkerId: string;
  requestedOn: string;
  withdrawn: boolean;
}

export type CoverDraft = Omit<CoverReq, "id" | "approvalId" | "withdrawn">;

export interface MoreSlice {
  newHires: NewHire[];
  claims: Claim[];
  timeFixes: TimeFix[];
  covers: CoverReq[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextMore: number;
}

export type MoreAction =
  | { type: "more-hire"; draft: NewHireDraft }
  | { type: "more-hire-withdraw"; id: string }
  | { type: "more-hire-restore"; id: string }
  | { type: "more-claim"; draft: ClaimDraft }
  | { type: "more-claim-withdraw"; id: string }
  | { type: "more-claim-restore"; id: string }
  | { type: "more-fix"; draft: TimeFixDraft }
  | { type: "more-fix-withdraw"; id: string }
  | { type: "more-fix-restore"; id: string }
  | { type: "more-cover"; draft: CoverDraft }
  | { type: "more-cover-withdraw"; id: string }
  | { type: "more-cover-restore"; id: string };

export const MORE_INITIAL: MoreSlice = { newHires: [], claims: [],
  timeFixes: [], covers: [], nextMore: 1 };

const flip = <T extends { id: string; withdrawn: boolean }>(xs: T[],
  id: string, withdrawn: boolean): T[] =>
  xs.map((x) => x.id === id ? { ...x, withdrawn } : x);

export function reduceMore<S extends MoreSlice>(s: S, a: MoreAction): S {
  const n = s.nextMore;
  switch (a.type) {
    case "more-hire":
      return { ...s, newHires: [{ ...a.draft, id: `hire-new-${n}`,
        approvalId: `more-ap-${n}`, withdrawn: false }, ...s.newHires],
      nextMore: n + 1 };
    case "more-claim":
      return { ...s, claims: [{ ...a.draft, id: `claim-new-${n}`,
        approvalId: `more-ap-${n}`, withdrawn: false }, ...s.claims],
      nextMore: n + 1 };
    case "more-fix":
      return { ...s, timeFixes: [{ ...a.draft, id: `fix-new-${n}`,
        approvalId: `more-ap-${n}`, withdrawn: false }, ...s.timeFixes],
      nextMore: n + 1 };
    case "more-hire-withdraw":
    case "more-hire-restore":
      return { ...s, newHires: flip(s.newHires, a.id,
        a.type === "more-hire-withdraw") };
    case "more-claim-withdraw":
    case "more-claim-restore":
      return { ...s, claims: flip(s.claims, a.id,
        a.type === "more-claim-withdraw") };
    case "more-fix-withdraw":
    case "more-fix-restore":
      return { ...s, timeFixes: flip(s.timeFixes, a.id,
        a.type === "more-fix-withdraw") };
    case "more-cover":
      return { ...s, covers: [{ ...a.draft, id: `cover-new-${n}`,
        approvalId: `more-ap-${n}`, withdrawn: false }, ...s.covers],
      nextMore: n + 1 };
    case "more-cover-withdraw":
    case "more-cover-restore":
      return { ...s, covers: flip(s.covers, a.id,
        a.type === "more-cover-withdraw") };
  }
}
