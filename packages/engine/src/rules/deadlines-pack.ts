import { deepFreeze } from "../freeze";
import { sourceOf } from "../sources";
import type { ParamValue, RuleParam, RulePack, RuleStatus } from "./types";

function param(
  value: ParamValue,
  status: Exclude<RuleStatus, "unsourced">,
  sourceId: string,
): RuleParam {
  return { value, status, source: sourceOf(sourceId) };
}

const o = "official";
const c = "convention";
const CONV = "ENGINE_CONVENTION";
const UNSOURCED: RuleParam = { value: null, status: "unsourced",
  source: null };

/**
 * WPS salary dates (docs/research/2026-11-25-wps-resolution-340.md).
 * Fines are reported only as "commonly understood"; no text was read,
 * so they have no value and nothing may compute them.
 */
const WPS: Record<string, RuleParam> = {
  // Summary: salary for month M is due on the 1st of month M+1.
  wpsDueDayOfNextMonth: param(1, "secondary", "MR340_2026_SUMMARY"),
  // Grace reports conflict (none, 10 or 15 days): alert from day 2.
  wpsLateAlertDayOfNextMonth: param(2, c, CONV),
  wpsFinePerWorkerFils: UNSOURCED,
  wpsFineCapFils: UNSOURCED,
};

/** GPSSA dates and late addition (docs/research/2026-11-26-gpssa-primary). */
const GPSSA: Record<string, RuleParam> = {
  // Art 12: "payable as of the first of the month following".
  gpssaPayableFromDayOfNextMonth: param(1, o, "DL57_ART12"),
  // Art 12: "may be extended until the fifteenth day of this month".
  gpssaLastDayOfNextMonth: param(15, o, "DL57_ART12"),
  // Art 11(4): "zero point one percent (0.1%) ... for each day".
  gpssaLateDailyBps: param(10, o, "DL57_ART11"),
  // Art 11(4): "must not exceed the value of the subscriptions due".
  gpssaLateCapBps: param(10000, o, "DL57_ART11"),
  gpssaLateRounding: param("DOWN", c, CONV),
};

/** Statutory deadlines, from Resolution 340's start (1 June 2026). */
const AE_DEADLINES_2026: RulePack = {
  id: "ae-deadlines",
  version: "2026-06-01",
  effectiveFrom: "2026-06-01",
  effectiveTo: null,
  params: { ...WPS, ...GPSSA },
};

export const DEADLINE_PACKS: readonly RulePack[] =
  deepFreeze([AE_DEADLINES_2026]);
