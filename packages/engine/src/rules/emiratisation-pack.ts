import { deepFreeze } from "../freeze";
import { sourceOf } from "../sources";
import type { ParamValue, RuleParam, RulePack } from "./types";

const SECONDARY = "RESEARCH_EMIRATISATION";
const CONVENTION = "ENGINE_CONVENTION";

/** A value the snippet-level research note reports (needs primary). */
function secondary(value: ParamValue): RuleParam {
  return { value, status: "secondary", source: sourceOf(SECONDARY) };
}

/** Our reading, not a reported figure. */
function convention(value: ParamValue): RuleParam {
  return { value, status: "convention", source: sourceOf(CONVENTION) };
}

/** No source gives the value; a company override is required. */
const UNSOURCED: RuleParam = { value: null, status: "unsourced",
  source: null };

const BANDS: Record<string, RuleParam> = {
  // "Emiratisation, 50+ staff".
  bandLargeMinHeadcount: secondary(50),
  // "Emiratisation, 20 to 49 staff; 14 sectors".
  bandMidMinHeadcount: secondary(20),
  // "checks 30 June, 31 Dec".
  largeCheckpoints: secondary("06-30,12-31"),
  // The note gives a yearly figure for 20 to 49 staff; year end is ours.
  midCheckpoints: convention("12-31"),
};

const LARGE: Record<string, RuleParam> = {
  // Half-year steps are not in the note.
  "largeTargetBps_2025-06-30": UNSOURCED,
  // Derived: "up 2% a year to 10% by end 2026" gives 8% at end 2025.
  "largeTargetBps_2025-12-31": convention(800),
  "largeTargetBps_2026-06-30": UNSOURCED,
  // "to 10% by end 2026".
  "largeTargetBps_2026-12-31": secondary(1000),
  // How a fractional required count rounds is not in the note.
  largeRequiredRounding: UNSOURCED,
  // The target is for "skilled roles"; counting skilled nationals only
  // is our reading.
  largeCountSkilledNationalsOnly: convention(true),
};

const MID: Record<string, RuleParam> = {
  // "one Emirati 2024, second 2025".
  "midRequired_2025-12-31": secondary(2),
  // The 2026 figure for 20 to 49 staff is not in the note.
  "midRequired_2026-12-31": UNSOURCED,
};

const WAGE_AND_FINE: Record<string, RuleParam> = {
  // "AED 6,000 from 1 Jan 2026".
  minWageFils: secondary(600000),
  // "not counted after 1 Jul 2026 if unadjusted".
  minWageCountingFrom: secondary("2026-07-01"),
  // Which pay items make up the wage is not in the note.
  minWageBase: convention("recurring-monthly-total"),
  // "108,000 (2025)" a year per unfilled post.
  finePerPostPerYear_2025: secondary(10800000),
  // Unresolved: AED 9,000 or 10,000 a month in the sources.
  finePerPostPerYear_2026: UNSOURCED,
};

/** Emiratisation targets, 2025 and 2026 only. */
const AE_EMIRATISATION: RulePack = {
  id: "ae-emiratisation",
  version: "2026-11-26",
  effectiveFrom: "2025-01-01",
  effectiveTo: "2027-01-01",
  params: { ...BANDS, ...LARGE, ...MID, ...WAGE_AND_FINE },
};

export const EMIRATISATION_PACKS: readonly RulePack[] =
  deepFreeze([AE_EMIRATISATION]);

/** The unsourced keys a company may enter itself. */
export const EMIRATISATION_OVERRIDABLE = [
  "largeTargetBps_2025-06-30",
  "largeTargetBps_2026-06-30",
  "largeRequiredRounding",
  "midRequired_2026-12-31",
  "finePerPostPerYear_2026",
] as const;

export const FINE_2026_NOTE = "The 2026 fine per unfilled post is " +
  "unresolved: sources give AED 9,000 and AED 10,000 a month. Enter a " +
  "figure to see an estimate.";

// Wrapped so no line ends in "from": the purity scan reads a quote
// after that word as an import.
export const EMIRATISATION_DISCLAIMER = "Planning estimate" +
  " from secondary sources. Not legal advice. Confirm targets and" +
  " counting rules with MOHRE.";
