import { EngineError } from "../errors";
import type {
  ParamValue,
  ResolvedParam,
  RulePack,
} from "./types";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysIn(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function assertIsoDate(value: string, what: string): void {
  const m = ISO.exec(value);
  const ok =
    m !== null &&
    Number(m[2]) >= 1 &&
    Number(m[2]) <= 12 &&
    Number(m[3]) >= 1 &&
    Number(m[3]) <= daysIn(Number(m[1]), Number(m[2]));
  if (!ok) {
    throw new EngineError(
      "INVALID_DATE",
      `${what} must be an ISO date YYYY-MM-DD`,
      { value, what },
    );
  }
}

function covers(pack: RulePack, onDate: string): boolean {
  assertIsoDate(pack.effectiveFrom, `pack ${pack.id} effectiveFrom`);
  if (pack.effectiveTo !== null) {
    assertIsoDate(pack.effectiveTo, `pack ${pack.id} effectiveTo`);
  }
  const started = pack.effectiveFrom <= onDate;
  const open = pack.effectiveTo === null || onDate < pack.effectiveTo;
  return started && open;
}

export function selectPack(packs: RulePack[], onDate: string): RulePack {
  assertIsoDate(onDate, "onDate");
  const hits = packs.filter((p) => covers(p, onDate));
  const [first, second] = hits;
  if (first === undefined) {
    throw new EngineError(
      "NO_PACK_FOR_DATE",
      `no rule pack is effective on ${onDate}`,
      { onDate },
    );
  }
  if (second !== undefined) {
    throw new EngineError(
      "OVERLAPPING_PACKS",
      `more than one rule pack is effective on ${onDate}`,
      { onDate, versions: hits.map((p) => p.version).join(",") },
    );
  }
  return first;
}

export function requireParam(
  pack: RulePack,
  key: string,
  overrides?: Record<string, ParamValue>,
): ResolvedParam {
  if (!Object.hasOwn(pack.params, key)) {
    throw new EngineError("MISSING_PARAM", `unknown param ${key}`, {
      key,
      packId: pack.id,
      packVersion: pack.version,
    });
  }
  const param = pack.params[key]!;
  const hasOverride =
    overrides !== undefined && Object.hasOwn(overrides, key);
  const value = hasOverride ? overrides[key]! : param.value;
  if (value === null || (!hasOverride && param.status === "unsourced")) {
    throw new EngineError(
      "UNSOURCED_PARAM",
      `param ${key} is unsourced; supply an explicit override`,
      { key, packId: pack.id, packVersion: pack.version },
    );
  }
  return {
    key,
    value,
    status: param.status,
    source: param.source,
    packId: pack.id,
    packVersion: pack.version,
    overridden: hasOverride,
  };
}
