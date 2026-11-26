/**
 * What people do on the Team and Growth screens during the demo: an
 * appraisal reminder, and a probation evaluation sent for a decision.
 * They live in the one demo store (state.tsx) as their own slice; the
 * action names start with `team-` so no other package collides.
 */
export type ProbationCall = "confirm" | "extend";

export interface ProbationScores {
  attendance: number;
  quality: number;
  teamwork: number;
  learning: number;
}

/** An evaluation sent by one person, waiting for another to decide. */
export interface ProbationRecord {
  evaluationId: string;
  employeeId: string;
  scores: ProbationScores;
  /** What the sender suggests; the decider may differ. */
  suggestion: ProbationCall;
  note: string;
  sentById: string;
  sentOn: string;
  checkerId: string;
  withdrawn: boolean;
  verdict: { byId: string; on: string; call: ProbationCall } | null;
}

export type ProbationDraft = Omit<ProbationRecord, "withdrawn" |
  "verdict">;

export interface Reminder {
  byId: string;
  on: string;
}

export interface TeamSlice {
  /** Evaluation id to the evaluation sent for it. */
  probationRecords: Record<string, ProbationRecord>;
  /** Cycle id to the reminder sent for it. */
  reminders: Record<string, Reminder>;
}

export type TeamAction =
  | { type: "team-probation-send"; draft: ProbationDraft }
  | { type: "team-probation-withdraw"; id: string }
  | { type: "team-probation-decide"; id: string; byId: string; on: string;
    call: ProbationCall }
  | { type: "team-probation-undo"; id: string }
  | { type: "team-remind"; cycleId: string; byId: string; on: string }
  | { type: "team-unremind"; cycleId: string };

export const TEAM_INITIAL: TeamSlice = { probationRecords: {},
  reminders: {} };

function without<T>(r: Record<string, T>, key: string)
  : Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduceTeam<S extends TeamSlice>(s: S, a: TeamAction): S {
  switch (a.type) {
    case "team-probation-send":
      return { ...s, probationRecords: { ...s.probationRecords,
        [a.draft.evaluationId]: { ...a.draft, withdrawn: false,
          verdict: null } } };
    case "team-probation-withdraw": {
      const r = s.probationRecords[a.id];
      return r === undefined ? s : { ...s, probationRecords: {
        ...s.probationRecords, [a.id]: { ...r, withdrawn: true } } };
    }
    case "team-probation-decide": {
      const r = s.probationRecords[a.id];
      return r === undefined ? s : { ...s, probationRecords: {
        ...s.probationRecords, [a.id]: { ...r, verdict: { byId: a.byId,
          on: a.on, call: a.call } } } };
    }
    case "team-probation-undo": {
      const r = s.probationRecords[a.id];
      return r === undefined ? s : { ...s, probationRecords: {
        ...s.probationRecords, [a.id]: { ...r, verdict: null } } };
    }
    case "team-remind":
      return { ...s, reminders: { ...s.reminders,
        [a.cycleId]: { byId: a.byId, on: a.on } } };
    case "team-unremind":
      return { ...s, reminders: without(s.reminders, a.cycleId) };
  }
}
