/**
 * Time decisions made during the demo (WP5): overtime accepted or
 * declined, a crew's overtime, and device punches matched to a person.
 * Each carries who did it; undo removes it. Lives in the one demo
 * store (state.tsx), appended like leave-state.ts.
 */
export type TimeVerdict = "accept" | "decline";

export interface TimeDecision {
  verdict: TimeVerdict;
  /** The person who decided (their role and the date are shown). */
  by: string;
}

export interface TimeSlice {
  /** Claim or crew request id to the decision made for it. */
  timeDecided: Record<string, TimeDecision>;
  /** Unmatched punch id to the employee it was matched to. */
  punchMatched: Record<string, string>;
}

export type TimeAction =
  | { type: "time-decide"; id: string; verdict: TimeVerdict; by: string }
  | { type: "time-undo"; id: string }
  | { type: "punch-match"; id: string; employeeId: string }
  | { type: "punch-unmatch"; id: string };

export const TIME_INITIAL: TimeSlice = { timeDecided: {},
  punchMatched: {} };

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduceTime<S extends TimeSlice>(s: S, a: TimeAction): S {
  switch (a.type) {
    case "time-decide":
      return { ...s, timeDecided: { ...s.timeDecided,
        [a.id]: { verdict: a.verdict, by: a.by } } };
    case "time-undo":
      return { ...s, timeDecided: without(s.timeDecided, a.id) };
    case "punch-match":
      return { ...s, punchMatched: { ...s.punchMatched,
        [a.id]: a.employeeId } };
    case "punch-unmatch":
      return { ...s, punchMatched: without(s.punchMatched, a.id) };
  }
}
