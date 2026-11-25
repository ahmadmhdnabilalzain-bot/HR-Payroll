import { EngineError } from "./errors";
import { sub, type Fils } from "./money";
import type { ParamValue, RulePack } from "./rules/types";
import {
  calculateSettlement,
  type SettlementInput,
  type SettlementResult,
} from "./settlement";
import { sourceOf } from "./sources";
import type { Traced } from "./trace-types";

export interface RuleChange {
  packId: string;
  key: string;
  newValue: ParamValue;
}

export interface RulePreview {
  hypothetical: true;
  before: Traced<SettlementResult>;
  after: Traced<SettlementResult>;
  delta: Fils;
}

function copyPack(pack: RulePack): RulePack {
  const params: RulePack["params"] = {};
  for (const [k, p] of Object.entries(pack.params)) {
    params[k] = { ...p, source: p.source ? { ...p.source } : null };
  }
  return { ...pack, params };
}

/** Deep copy of the packs with exactly one parameter replaced. */
function applyChange(packs: RulePack[], change: RuleChange): RulePack[] {
  if (!packs.some((p) => p.id === change.packId)) {
    throw new EngineError("MISSING_PACK",
      `No rule pack with id ${change.packId}`, { packId: change.packId });
  }
  return packs.map((pack) => {
    const copy = copyPack(pack);
    if (pack.id !== change.packId) return copy;
    if (!Object.hasOwn(copy.params, change.key)) {
      throw new EngineError("MISSING_PARAM",
        `No parameter ${change.key} in pack ${pack.id}`,
        { key: change.key, packId: pack.id });
    }
    copy.params[change.key] = {
      value: change.newValue,
      status: "hypothetical",
      source: sourceOf("HYPOTHETICAL"),
    };
    return copy;
  });
}

export function previewRuleChange(
  input: SettlementInput,
  packs: RulePack[],
  change: RuleChange,
): RulePreview {
  const changed = applyChange(packs, change);
  const before = calculateSettlement(input, packs);
  const after = calculateSettlement(input, changed);
  return {
    hypothetical: true,
    before,
    after,
    delta: sub(after.value.total, before.value.total),
  };
}
