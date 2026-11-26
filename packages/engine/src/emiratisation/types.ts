import type { Fils } from "../money";
import type { TraceLine } from "../trace-types";

/** Restated from the contract's EmiratisationReport (no zod here). */
export const NOT_COUNTED_REASONS = Object.freeze([
  "flags-not-entered",
  "work-permit-not-valid",
  "not-paid-via-wps",
  "not-gpssa-registered",
  "below-minimum-wage",
] as const);

export type NotCountedReason = (typeof NOT_COUNTED_REASONS)[number];

export interface EmiratisationEmployee {
  employeeId: string;
  isUaeNational: boolean;
  joiningDate: string;
  lastWorkingDate: string | null;
  skilled: boolean | null;
  workPermitValid: boolean | null;
  paidViaWps: boolean | null;
  gpssaRegistered: boolean | null;
  monthlyWage: Fils | null;
}

export interface EmiratisationInput {
  asOf: string;
  sectorInScope: boolean | null;
  employees: EmiratisationEmployee[];
}

export type EmiratisationBand = "large" | "mid" | "none" | "unknown";

export type EmiratisationStatus =
  | "on-target"
  | "below-target"
  | "not-applicable"
  | "needs-input";

export interface NotCounted {
  employeeId: string;
  reasons: NotCountedReason[];
}

export interface EmiratisationResult {
  asOf: string;
  checkpoint: string | null;
  band: EmiratisationBand;
  status: EmiratisationStatus;
  headcount: number;
  skilledHeadcount: number | null;
  nationals: number;
  countedNationals: number;
  required: number | null;
  shortfall: number | null;
  notCounted: NotCounted[];
  missingInputs: string[];
  missingParams: string[];
  fineExposure: Fils | null;
  fineNote: string | null;
  trace: TraceLine[];
  disclaimer: string;
}
