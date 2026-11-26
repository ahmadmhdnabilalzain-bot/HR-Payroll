import { isValidIsoDate } from "../dates";
import { EngineError } from "../errors";
import type { Typed } from "../gratuity-params";
import { requireParam } from "../rules/select";
import type { ParamValue, ResolvedParam, RulePack } from "../rules/types";
import { traceRule } from "../trace";

type Overrides = Record<string, ParamValue> | undefined;

/** The pack, the overrides and the unsourced keys met so far. */
export interface ParamCtx {
  pack: RulePack;
  ov: Overrides;
  missing: string[];
}

export type CountRounding = "DOWN" | "HALF_UP" | "UP";

const COUNT_ROUNDING: readonly string[] = ["DOWN", "HALF_UP", "UP"];

function invalid(key: string, value: ParamValue, want: string): never {
  throw new EngineError("INVALID_PARAM", `param ${key} must be ${want}`, {
    key,
    value: String(value),
  });
}

/** A param, or null (key recorded once) when it is unsourced. */
export function tryParam(ctx: ParamCtx, key: string): ResolvedParam | null {
  try {
    return requireParam(ctx.pack, key, ctx.ov);
  } catch (e) {
    if (!(e instanceof EngineError) || e.code !== "UNSOURCED_PARAM") {
      throw e;
    }
    if (!ctx.missing.includes(key)) ctx.missing.push(key);
    return null;
  }
}

function asInt(p: ResolvedParam): Typed<bigint> {
  if (typeof p.value !== "number" || !Number.isSafeInteger(p.value) ||
    p.value < 0) {
    invalid(p.key, p.value, "a whole number of at least 0");
  }
  return { v: BigInt(p.value), rule: traceRule(p) };
}

export function tryInt(ctx: ParamCtx, key: string): Typed<bigint> | null {
  const p = tryParam(ctx, key);
  return p === null ? null : asInt(p);
}

export function tryRounding(ctx: ParamCtx): Typed<CountRounding> | null {
  const p = tryParam(ctx, "largeRequiredRounding");
  if (p === null) return null;
  if (typeof p.value !== "string" || !COUNT_ROUNDING.includes(p.value)) {
    invalid(p.key, p.value, COUNT_ROUNDING.join(" or "));
  }
  return { v: p.value as CountRounding, rule: traceRule(p) };
}

/** A sourced ISO date param such as the minimum-wage counting date. */
export function dateParam(ctx: ParamCtx, key: string): Typed<string> {
  const p = requireParam(ctx.pack, key, ctx.ov);
  if (typeof p.value !== "string" || !isValidIsoDate(p.value)) {
    invalid(key, p.value, "an ISO date YYYY-MM-DD");
  }
  return { v: p.value, rule: traceRule(p) };
}

/** Checkpoint dates of year from a "MM-DD,MM-DD" param, sorted. */
export function checkpointsParam(ctx: ParamCtx, key: string,
  year: string): Typed<string[]> {
  const p = requireParam(ctx.pack, key, ctx.ov);
  const raw = typeof p.value === "string" ? p.value.split(",") : [];
  const dates = raw.map((md) => `${year}-${md.trim()}`);
  if (dates.length === 0 || !dates.every((d) => isValidIsoDate(d))) {
    invalid(key, p.value, "a list of MM-DD days");
  }
  return { v: [...dates].sort(), rule: traceRule(p) };
}
