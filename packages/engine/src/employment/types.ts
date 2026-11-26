export type ExitKind =
  | "resignation"
  | "termination"
  | "summary-dismissal"
  | "worker-exit-without-notice"
  | "probation-employer-termination"
  | "probation-leave-state"
  | "probation-new-employer";

export const EXIT_KINDS: readonly ExitKind[] = Object.freeze([
  "resignation",
  "termination",
  "summary-dismissal",
  "worker-exit-without-notice",
  "probation-employer-termination",
  "probation-leave-state",
  "probation-new-employer",
]);

/** Exit kinds that exist only while the worker is in probation. */
export const PROBATION_KINDS: readonly ExitKind[] = Object.freeze([
  "probation-employer-termination",
  "probation-leave-state",
  "probation-new-employer",
]);

export type NoticeFlag =
  | "reduced-by-agreement"
  | "counsel-review"
  | "job-search-day";

export interface ProbationInput {
  joiningDate: string;
  probationMonths: number;
}

export interface ProbationResult {
  probationEndDate: string | null;
  employerNoticeDeadline: string | null;
}

export interface NoticeInput {
  kind: ExitKind;
  joiningDate: string;
  noticeGivenDate: string;
  probationEndDate: string | null;
  contractNoticeDays: number | null;
  agreedNoticeDays: number | null;
}

export interface NoticeResult {
  kind: ExitKind;
  inProbation: boolean;
  noticeDays: number;
  lastWorkingDate: string;
  settlementDueDate: string;
  flags: NoticeFlag[];
}
