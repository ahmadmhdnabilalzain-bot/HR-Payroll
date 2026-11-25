export type RuleStatus =
  | "official"
  | "secondary"
  | "convention"
  | "hypothetical"
  | "unsourced";

export type ParamValue = number | boolean | string;

export interface RuleSource {
  url: string;
  note: string;
}

export interface RuleParam {
  value: ParamValue | null;
  status: RuleStatus;
  source: RuleSource | null;
}

export interface RulePack {
  id: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  params: Record<string, RuleParam>;
}

export interface ResolvedParam {
  key: string;
  value: ParamValue;
  status: RuleStatus;
  source: RuleSource | null;
  packId: string;
  packVersion: string;
  overridden: boolean;
}
