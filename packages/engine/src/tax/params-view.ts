import { selectPack } from "../rules/select";
import type { RulePack, RuleStatus } from "../rules/types";

/** One pack param as shown to a person: value, status and source. */
export interface ParamView {
  packId: string;
  packVersion: string;
  key: string;
  value: string | null;
  status: RuleStatus;
  sourceNote: string | null;
  sourceUrl: string | null;
}

/**
 * The params of the pack selected on onDate, in key order. Numbers
 * and booleans become strings; an unsourced value stays null. An
 * empty url (an engine convention) is shown as null.
 */
export function packParamsView(
  packs: readonly RulePack[],
  onDate: string,
): ParamView[] {
  const pack = selectPack(packs, onDate);
  return Object.keys(pack.params).sort().map((key) => {
    const p = pack.params[key]!;
    return {
      packId: pack.id,
      packVersion: pack.version,
      key,
      value: p.value === null ? null : String(p.value),
      status: p.status,
      sourceNote: p.source === null ? null : p.source.note,
      sourceUrl: p.source === null || p.source.url === "" ? null
        : p.source.url,
    };
  });
}
