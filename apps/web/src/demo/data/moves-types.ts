import type { Fils } from "@payroll/engine";

/**
 * Hiring, joining and leaving (WP3): the package's own view types,
 * re-exported as types only, so screens never import the package.
 */
export type {
  CandidateStage,
  EmploymentEndView,
  HiringCandidate,
  HiringOffer,
  HiringRequisition,
  HiringSummary,
  JoinerChecklistView,
  LeaverChecklistView,
  MoveChecklistItem,
  OfferStatus,
  StaffMove,
} from "@payroll/demo-data";

/** One line of an offer letter: words, or a labelled pay figure. */
export type LetterLine =
  | { kind: "text"; text: string }
  | { kind: "pay"; label: string; fils: Fils };

import type {
  CandidateStage,
  EmploymentEndView,
  HiringCandidate,
  HiringOffer,
  HiringRequisition,
  HiringSummary,
  JoinerChecklistView,
  LeaverChecklistView,
  StaffMove,
} from "@payroll/demo-data";

/** What the Joining, leaving and Hiring screens read. */
export interface MovesData {
  asOf: string;
  requisitions(): HiringRequisition[];
  vacancies(): HiringRequisition[];
  candidates(): HiringCandidate[];
  stages(): { stage: CandidateStage; label: string }[];
  offers(): HiringOffer[];
  letter(offerId: string): LetterLine[];
  joiners(): JoinerChecklistView[];
  leavers(): LeaverChecklistView[];
  endings(): EmploymentEndView[];
  moves(): StaffMove[];
  summary(): HiringSummary;
}
