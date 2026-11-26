import { isValidIsoDate } from "../dates";
import { EngineError } from "../errors";
import type { Typed } from "../gratuity-params";
import type { RoundingMode } from "../money";
import { requireParam } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { traceRule } from "../trace";

export { boolParam, intParam, type Typed } from "../gratuity-params";

type Overrides = Record<string, ParamValue> | undefined;

const MODES: readonly string[] = ["HALF_UP", "HALF_EVEN", "DOWN", "UP"];

function invalid(key: string, value: ParamValue, want: string): never {
  throw new EngineError("INVALID_PARAM", `param ${key} must be ${want}`,
    { key, value: String(value) });
}

export function strParam(pack: RulePack, key: string,
  ov?: Overrides): Typed<string> {
  const p = requireParam(pack, key, ov);
  if (typeof p.value !== "string") invalid(key, p.value, "text");
  return { v: p.value, rule: traceRule(p) };
}

export function dateParam(pack: RulePack, key: string,
  ov?: Overrides): Typed<string> {
  const p = strParam(pack, key, ov);
  if (!isValidIsoDate(p.v)) invalid(key, p.v, "an ISO date");
  return p;
}

/** A rounding mode under any key (vatRounding, taxRounding). */
export function modeParam(pack: RulePack, key: string,
  ov?: Overrides): Typed<RoundingMode> {
  const p = strParam(pack, key, ov);
  if (!MODES.includes(p.v)) invalid(key, p.v, MODES.join(" or "));
  return { v: p.v as RoundingMode, rule: p.rule };
}
