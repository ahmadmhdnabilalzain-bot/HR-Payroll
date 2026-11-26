import { sourceOf } from "../sources";
import type { ParamValue, RuleParam, RuleStatus } from "./types";

/** A sourced tax pack param; the status follows the research mapping. */
export function sourced(
  value: ParamValue,
  status: Exclude<RuleStatus, "unsourced" | "hypothetical">,
  sourceId: string,
): RuleParam {
  return { value, status, source: sourceOf(sourceId) };
}

/** NOT FOUND in the research: no value, no default, no source. */
export function unsourced(): RuleParam {
  return { value: null, status: "unsourced", source: null };
}

export const SEC = "secondary";
export const OFF = "official";
export const CONV = "convention";
