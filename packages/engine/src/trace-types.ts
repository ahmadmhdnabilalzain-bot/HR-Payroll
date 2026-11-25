import type { RuleStatus } from "./rules/types";

export interface TraceRule {
  key: string;
  value: string;
  status: RuleStatus;
  packId: string;
  packVersion: string;
  overridden: boolean;
}

export interface TraceLine {
  id: string;
  label: string;
  formula: string;
  inputs: Record<string, string>;
  result: string;
  rules: TraceRule[];
}

export interface Traced<T> {
  value: T;
  trace: TraceLine[];
}
